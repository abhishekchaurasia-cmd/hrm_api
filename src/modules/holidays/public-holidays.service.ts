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

interface StaticHoliday {
  name: string;
  localName: string;
  date: string;
  isOptional: boolean;
  isSpecial: boolean;
  types: string[];
  isGlobal: boolean;
}

const STATIC_COUNTRIES: PublicHolidayCountry[] = [
  { countryCode: 'IN', name: 'India' },
];

const INDIA_GAZETTED_HOLIDAYS: StaticHoliday[] = [
  {
    name: 'Republic Day',
    localName: 'गणतन्त्र दिवस',
    date: '-01-26',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Maha Shivaratri',
    localName: 'महा शिवरात्रि',
    date: '-02-26',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Holi',
    localName: 'होली',
    date: '-03-14',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Good Friday',
    localName: 'गुड फ्राइडे',
    date: '-03-29',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Id-ul-Fitr (Eid)',
    localName: 'ईद उल-फ़ित्र',
    date: '-03-31',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Dr. Ambedkar Jayanti',
    localName: 'डॉ. अम्बेडकर जयन्ती',
    date: '-04-14',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Ram Navami',
    localName: 'राम नवमी',
    date: '-04-06',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Mahavir Jayanti',
    localName: 'महावीर जयन्ती',
    date: '-04-10',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'May Day',
    localName: 'मई दिवस',
    date: '-05-01',
    isOptional: true,
    isSpecial: false,
    types: ['Optional'],
    isGlobal: false,
  },
  {
    name: 'Buddha Purnima',
    localName: 'बुद्ध पूर्णिमा',
    date: '-05-12',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Id-ul-Zuha (Bakrid)',
    localName: 'ईद उल-अज़हा',
    date: '-06-07',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Muharram',
    localName: 'मुहर्रम',
    date: '-07-06',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Independence Day',
    localName: 'स्वतन्त्रता दिवस',
    date: '-08-15',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Milad-un-Nabi (Prophet Muhammad Birthday)',
    localName: 'मीलाद-उन-नबी',
    date: '-09-05',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Mahatma Gandhi Jayanti',
    localName: 'महात्मा गांधी जयन्ती',
    date: '-10-02',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Dussehra',
    localName: 'दशहरा',
    date: '-10-03',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Diwali',
    localName: 'दीपावली',
    date: '-10-20',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Guru Nanak Jayanti',
    localName: 'गुरु नानक जयन्ती',
    date: '-11-05',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
  {
    name: 'Christmas',
    localName: 'क्रिसमस',
    date: '-12-25',
    isOptional: false,
    isSpecial: false,
    types: ['Public'],
    isGlobal: true,
  },
];

const CACHE_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class PublicHolidaysService {
  private readonly logger = new Logger(PublicHolidaysService.name);
  private readonly baseUrl = 'https://date.nager.at/api/v3';
  private countriesCache: PublicHolidayCountry[] | null = null;
  private countriesCacheTime = 0;

  constructor(private readonly httpService: HttpService) {}

  async getAvailableCountries(): Promise<PublicHolidayCountry[]> {
    const now = Date.now();
    if (this.countriesCache && now - this.countriesCacheTime < CACHE_TTL_MS) {
      return this.countriesCache;
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.get<PublicHolidayCountry[]>(
          `${this.baseUrl}/AvailableCountries`
        )
      );

      const staticCodes = new Set(STATIC_COUNTRIES.map(c => c.countryCode));
      const merged = [
        ...STATIC_COUNTRIES,
        ...data.filter(c => !staticCodes.has(c.countryCode)),
      ].sort((a, b) => a.name.localeCompare(b.name));

      this.countriesCache = merged;
      this.countriesCacheTime = now;
      return merged;
    } catch (error) {
      this.logger.error(
        'Failed to fetch available countries from Nager.Date',
        error
      );
      if (this.countriesCache) {
        return this.countriesCache;
      }
      return [...STATIC_COUNTRIES];
    }
  }

  private isStaticCountry(countryCode: string): boolean {
    return STATIC_COUNTRIES.some(
      c => c.countryCode.toUpperCase() === countryCode.toUpperCase()
    );
  }

  private getStaticHolidays(
    year: number,
    countryCode: string
  ): MappedPublicHoliday[] {
    if (countryCode.toUpperCase() === 'IN') {
      return INDIA_GAZETTED_HOLIDAYS.map(h => ({
        ...h,
        date: `${year}${h.date}`,
      }));
    }
    return [];
  }

  async getPublicHolidays(
    year: number,
    countryCode: string
  ): Promise<MappedPublicHoliday[]> {
    const code = countryCode.toUpperCase();

    if (this.isStaticCountry(code)) {
      return this.getStaticHolidays(year, code);
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
        this.httpService.get<NagerHoliday[]>(
          `${this.baseUrl}/PublicHolidays/${year}/${code}`
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
        `Failed to fetch public holidays for ${code}/${year}`,
        error
      );
      throw new BadGatewayException(
        'Public holidays service is temporarily unavailable'
      );
    }
  }
}
