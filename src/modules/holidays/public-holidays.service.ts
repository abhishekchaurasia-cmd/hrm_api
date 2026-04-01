import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface PublicHolidayCountry {
  countryCode: string;
  name: string;
}

export interface MappedPublicHoliday {
  name: string;
  localName: string;
  date: string;
  isOptional: boolean;
  isSpecial: boolean;
  types: string[];
  isGlobal: boolean;
}

interface CalendarificCountry {
  country_name: string;
  'iso-3166': string;
  total_holidays: number;
  supported_languages: number;
  uuid: string;
}

interface CalendarificHoliday {
  name: string;
  description: string;
  country: { id: string; name: string };
  date: {
    iso: string;
    datetime: { year: number; month: number; day: number };
  };
  type: string[];
  primary_type: string;
  canonical_url: string;
  urlid: string;
  locations: string;
  states: string;
}

interface CalendarificCountriesResponse {
  meta: { code: number };
  response: { countries: CalendarificCountry[] };
}

interface CalendarificHolidaysResponse {
  meta: { code: number };
  response: { holidays: CalendarificHoliday[] };
}

const CACHE_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class PublicHolidaysService {
  private readonly logger = new Logger(PublicHolidaysService.name);
  private readonly baseUrl = 'https://calendarific.com/api/v2';
  private readonly apiKey: string;
  private countriesCache: PublicHolidayCountry[] | null = null;
  private countriesCacheTime = 0;
  private holidaysCache = new Map<
    string,
    { data: MappedPublicHoliday[]; time: number }
  >();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.apiKey = this.configService.get<string>('CALENDARIFIC_API_KEY', '');
    if (!this.apiKey) {
      this.logger.warn(
        'CALENDARIFIC_API_KEY is not set. Public holidays API will not work.'
      );
    }
  }

  async getAvailableCountries(): Promise<PublicHolidayCountry[]> {
    const now = Date.now();
    if (this.countriesCache && now - this.countriesCacheTime < CACHE_TTL_MS) {
      return this.countriesCache;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<CalendarificCountriesResponse>(
          `${this.baseUrl}/countries`,
          { params: { api_key: this.apiKey } }
        )
      );

      const countries: PublicHolidayCountry[] = data.response.countries.map(
        c => ({
          countryCode: c['iso-3166'],
          name: c.country_name,
        })
      );

      countries.sort((a, b) => a.name.localeCompare(b.name));

      this.countriesCache = countries;
      this.countriesCacheTime = now;
      return countries;
    } catch (error) {
      this.logger.error(
        'Failed to fetch available countries from Calendarific',
        error
      );
      if (this.countriesCache) {
        return this.countriesCache;
      }
      throw new BadGatewayException(
        'Public holidays service is temporarily unavailable'
      );
    }
  }

  async getPublicHolidays(
    year: number,
    countryCode: string
  ): Promise<MappedPublicHoliday[]> {
    const code = countryCode.toUpperCase();
    const cacheKey = `${code}-${year}`;
    const now = Date.now();

    const cached = this.holidaysCache.get(cacheKey);
    if (cached && now - cached.time < CACHE_TTL_MS) {
      return cached.data;
    }

    const countries = await this.getAvailableCountries();
    const valid = countries.some(c => c.countryCode.toUpperCase() === code);
    if (!valid) {
      throw new BadRequestException(
        `Country code "${countryCode}" is not supported`
      );
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<CalendarificHolidaysResponse>(
          `${this.baseUrl}/holidays`,
          {
            params: {
              api_key: this.apiKey,
              country: code,
              year,
              type: 'national,religious',
            },
          }
        )
      );

      const holidays: MappedPublicHoliday[] = data.response.holidays.map(h => ({
        name: h.name,
        localName: h.name,
        date: h.date.iso,
        isOptional: h.type.some(
          t =>
            t.toLowerCase() === 'observance' ||
            t.toLowerCase() === 'optional holiday'
        ),
        isSpecial: h.type.some(
          t =>
            t.toLowerCase() === 'local holiday' ||
            t.toLowerCase() === 'restricted holiday'
        ),
        types: h.type,
        isGlobal: h.locations === 'All',
      }));

      this.holidaysCache.set(cacheKey, { data: holidays, time: now });
      return holidays;
    } catch (error) {
      this.logger.error(
        `Failed to fetch public holidays for ${code}/${year}`,
        error
      );
      throw new BadGatewayException(
        'Public holidays service is temporarily unavailable'
      );
    }
  }
}
