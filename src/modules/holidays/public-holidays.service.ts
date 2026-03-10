import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  Logger,
  BadGatewayException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

export interface PublicHolidayCountry {
  countryCode: string;
  name: string;
}

export interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
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

@Injectable()
export class PublicHolidaysService {
  private readonly logger = new Logger(PublicHolidaysService.name);
  private readonly baseUrl = 'https://date.nager.at/api/v3';
  private countriesCache: PublicHolidayCountry[] | null = null;

  constructor(private readonly httpService: HttpService) {}

  async getAvailableCountries(): Promise<PublicHolidayCountry[]> {
    if (this.countriesCache) {
      return this.countriesCache;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<PublicHolidayCountry[]>(
          `${this.baseUrl}/AvailableCountries`
        )
      );
      this.countriesCache = data;
      return data;
    } catch (error) {
      this.logger.error(
        'Failed to fetch available countries from Nager.Date',
        error
      );
      throw new BadGatewayException(
        'Public holidays service is temporarily unavailable'
      );
    }
  }

  async getPublicHolidays(
    year: number,
    countryCode: string
  ): Promise<MappedPublicHoliday[]> {
    const countries = await this.getAvailableCountries();
    const valid = countries.some(
      c => c.countryCode.toUpperCase() === countryCode.toUpperCase()
    );
    if (!valid) {
      throw new BadRequestException(
        `Country code "${countryCode}" is not supported`
      );
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<NagerHoliday[]>(
          `${this.baseUrl}/PublicHolidays/${year}/${countryCode.toUpperCase()}`
        )
      );

      return data.map(h => ({
        name: h.name,
        localName: h.localName,
        date: h.date,
        isOptional:
          h.types.includes('Optional') || h.types.includes('Observance'),
        isSpecial: h.types.includes('Bank') || h.types.includes('Authorities'),
        types: h.types,
        isGlobal: h.global,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch public holidays for ${countryCode}/${year}`,
        error
      );
      throw new BadGatewayException(
        'Public holidays service is temporarily unavailable'
      );
    }
  }
}
