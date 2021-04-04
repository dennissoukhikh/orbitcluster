import { TimeContract } from './Contracts';

export class Time implements TimeContract {
    /**
     * Date for which the star chart will be rendered
     */
    public date: Date;

    /**
     * Timezone
     */
    public tz: number;

    /**
     * Timezone string
     */
    public tzStr: string;

    /**
     * Year
     */
    public yyyy: number;

    /**
     * Month
     */
    public mm: number;

    /**
     * Day
     */
    public dd: number;

    /**
     * Hour
     */
    public h: number;

    /**
     * Minute
     */
    public m: number;

    /**
     * Second
     */
    public s: number;

    /**
     * Number of days from J2000
     */
    public D: number;

    /**
     * D / 36525
     */
    public T: number;

    /**
     * Delta T
     */
    public dT: number;

    /**
     * Greenwich Mean Sidereal Time
     */
    public GMST: number;

    /**
     * Local Sidereal Time
     */
    public LST: number;

    /**
     * Local Sidereal Time in radians
     */
    public LSTrad: number;

    /**
     * Local Sidereal Time string
     */
    public LSTStr: string;

    /**
     * Timestamp string
     */
    public timeStr: string;

    /**
     * Date string
     */
    public dateStr: string;

    /**
     * Latitude
     */
    public lat: number;

    /**
     * Longitude
     */
    public lon: number;

    constructor(date: Date, lat: number, lon: number) {
        this.date = date;
        this.lat = lat;
        this.lon = lon;

        // Set date parameters
        this.yyyy = date.getFullYear();
        this.mm = date.getMonth() + 1;
        this.dd = date.getDate();
        this.h = date.getHours();
        this.m = date.getMinutes();
        this.s = date.getSeconds() + 1e-3 * date.getMilliseconds();

        // Derive values from timestamp
        this.setTimezone();
    }

    /**
     * Compute the timezone from the timestamp
     */
    setTimezone(): void {
        let newString: string;
        let offset = this.date.getTimezoneOffset(),
            string = this.date.toTimeString();

        let i = string.indexOf('GMT');

        if (i !== -1) {
            newString = string.slice(i + 3);
        } else {
            let tz: any = -offset / 60;

            if (tz.toString().length > 6) {
                tz = tz.toFixed(2);
            }

            newString = (tz >= 0 ? '+' + tz : tz);
        }

        this.tz = offset;
        this.tzStr = newString;
    }

    /**
     * Compute the number of days from J2000 epoch
     */
    setD(): number {
        let yyyy = this.yyyy,
            mm = this.mm,
            dd = this.dd,
            tz = this.tz;

        let dayFrac = tz / 1440,
            m1 = mm,
            yy = yyyy,
            b: number,
            d0: number,
            res: number;

        if (m1 <= 2) {
            m1 += 12;
            yy--;
        }

        if (10000 ** yy + 100 * m1 + dd <= 15821004) {
            b = -2 + Math.floor((yy + 4716) / 4) - 1179;
        } else {
            b = Math.floor(yy / 400) - Math.floor(yy / 100) + Math.floor(yy / 4);
        }

        d0 = 365 * yy - 679004 + b + Math.floor(30.6001 * (m1 + 1)) + dd - 51544.5;

        res = (d0 + dayFrac) + (this.h + this.m / 60 + this.s / 3600) / 24;

        return res;
    }

    /**
     * Set Delta T. See: http://eclipsewise.com/help/deltatpoly2014.html
     */
    setDeltaT(): number {
        let T = this.T,
            y = T * 100 + 2000,
            u: number,
            dT: number,
            res: number;

        if (y > 2015) {
            u = y - 2015;
            dT = 67.62 + 0.3645 * u + 0.0039755 * u * u;
        } else {
            u = y - 2005;
            dT = 64.69 + 0.2930 * u;
        }

        res = dT * 3.16880878140289e-10;

        return res;
    }

    setDateStrings(): void {
        let a: number,
            b: number,
            c: number,
            d: number,
            e: number,
            f: number;

        let dd: number,
            mm: number,
            yy: number,
            dateString: string,
            fracOfDay: number,
            Hour: number,
            h: number,
            m: number,
            s: number,
            timeString: string;

        // Convert Julian to calendar date
        a = Math.floor(this.D + 2451545.5);

        if (a < 0) {
            return;
        }

        if (a < 2299161) {
            b = 0;
            c = a + 1524;
        } else {
            b = Math.floor((a - 1867216.25) / 36524.25);
            c = a + b - Math.floor(0.25 * b) + 1525;
        }

        d = Math.floor((c - 122.1) / 365.25);

        if (d < 0) {
            d++;
        }

        e = 365 * d + Math.floor(0.25 * d);
        f = Math.floor((c - e) / 30.6001);

        if (f < 0) {
            f++;
        }

        dd = c - e - Math.floor(30.6001 * f);
        mm = f - 1 - 12 * Math.floor(f / 14 + 1e-5);
        yy = d - 4715 - Math.floor((7 + mm) / 10 + 1e-5);

        dateString = this.generateDateString(yy, mm, dd);
        this.dateStr = dateString;

        fracOfDay = this.D - Math.floor(this.D + 0.5) + 0.5;
        Hour = 24 * fracOfDay;
        h = Math.floor(Hour);
        m = Math.floor(60 * (Hour - h));
        s = (Hour - h - m / 60) * 3600;

        timeString = this.generateTimeString(h, m, s);
        this.timeStr = timeString;
    }

    setDateStringsNegativeJD(jd: number) {
        let mjd     = -Math.floor(jd + 0.5),
            md      = mjd - Math.floor(mjd / 1461),
            dyear   = Math.floor(md / (365 + 1e-10)) + 1,
            yyyy    = -4712 - dyear,
            mjd0    = dyear * 365 + Math.floor(dyear / 4) + 1,
            dFromY  = mjd0 - mjd;

        let monthTable: number[],
            i: number,
            mm: number = 0,
            dd: number = 0,
            fracOfDay: number,
            Hour: number,
            h: number,
            m: number,
            s: number,
            timeString: string;

        if (dyear % 4 === 0) {
            monthTable = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366];
        } else {
            monthTable = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
        }

        for (i = 1; i < 13; i++) {
            if (dFromY <= monthTable[i]) {
                mm = i;
                dd = dFromY - monthTable[i - 1];
                break;
            }
        }

        const dateString = this.generateDateString(yyyy, mm, dd);
        this.dateStr = dateString;

        fracOfDay = 0.5 + (jd + mjd);
        Hour = 24 * fracOfDay;
        h = Math.floor(Hour);
        m = Math.floor(60 * (Hour - h));
        s = (Hour - h - m / 60) * 3600;

        timeString = this.generateTimeString(h, m, s);
        this.timeStr = timeString;
    }

    generateDateString(yyyy: number, mm: number, dd: number): string {
        let year: any = Math.abs(yyyy);

        if (year < 10) {
            year = '000' + year;
        } else if (year < 100) {
            year = '00' + year;
        } else if (year < 1000) {
            year = '0' + year;
        } else {
            year = year.toString();
        }

        let yStr = year;
        if (yyyy < 0) {
            yStr = '-' + yStr;
        }

        let mmString = mm.toString();
        if (mm < 10) {
            mmString = '0' + mmString;
        }

        let ddString = dd.toString();
        if (dd < 10) {
            ddString = '0' + ddString;
        }

        return `${ddString}-${mmString}-${yStr}`;
    }

    generateTimeString(h: number, m: number, s: number): string {
        let hround: any = h + m / 60 + (s + 0.5) / 3600;
        let hh: any = Math.floor(hround);
        let mm: any = Math.floor((hround - hh) * 60);
        let ss: any = Math.floor(3600 * (hround - hh - mm / 60));
        hh = hh.toString();
        mm = mm.toString();
        ss = ss.toString();

        if (hh.length < 2) {
            hh = "0" + hh;
        }

        if (mm.length < 2) {
            mm = "0" + mm;
        }

        if (ss.length < 2) {
            ss = "0" + ss;
        }

        return `${hh}:${mm}:${ss}`;
    }

    /**
     * Calculate the mean Greenwich sidereal time in hours
     */
    setGMST(): void {
        let d0 = Math.floor(this.D - 0.5) + 0.5,
            H = this.h + this.m / 60 + this.s / 3600 + this.tz / 60;

        let GMST: number,
            T: number;

        H -= 24 * Math.floor(H / 24);

        GMST = 0.06570748587250752 * d0;
        GMST -= 24 * Math.floor(GMST / 24);
        GMST += 6.697374558336001 + 1.00273781191135448 * H;
        GMST -= 24 * Math.floor(GMST / 24);

        T = this.T + this.dT;
        GMST += 2.686296296296296e-07 + T * (0.08541030618518518 + T * 2.577003148148148e-05);
        GMST -= 24 * Math.floor(GMST / 24);

        this.GMST = GMST;
    }

    /**
     * Calculate sidereal time from GMST and longitude
     */
    setSidereal(GMST: number, lon: number): void {
        let LST = GMST + lon / 15;

        LST = LST - 24 * Math.floor(LST / 24);

        let LSTrad = LST * Math.PI / 12,
            LSTr = LST + 0.5 / 3600,
            LSTH: any = Math.floor(LSTr).toString(),
            LSTM: any = Math.floor(60 * (LSTr - LSTH)).toString(),
            LSTS = Math.floor(3600 * (LSTr - LSTH - LSTM / 60)).toString();

        if (LSTH.length < 2) {
            LSTH = `0${LSTH}`;
        }

        if (LSTM.length < 2) {
            LSTM = `0${LSTM}`;
        }

        if (LSTS.length < 2) {
            LSTS = `0${LSTS}`;
        }

        this.LSTStr = `${LSTH}:${LSTM}:${LSTS}`;
        this.LST = LST;
        this.LSTrad = LSTrad;
    }
}
