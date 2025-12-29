import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RaceService {
  private apiUrl = '/api';
  public expandedGroups: Set<string> = new Set();

  constructor(private http: HttpClient) { }

  getUpcomingRaces(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/races`);
  }

  getRaceAnalysis(raceId: number, track: string, date: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/analysis/${raceId}?track=${track}&date=${date}`);
  }

  scrapeData(source: string = 'atg', gameId?: string, racedayId?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/scrape`, { source, gameId, racedayId });
  }

  scrapeAll(): Observable<any> {
    return this.http.post(`${this.apiUrl}/scrape`, { all: true });
  }

  cleanDatabase(): Observable<any> {
    return this.http.post(`${this.apiUrl}/clean-database`, {});
  }
}
