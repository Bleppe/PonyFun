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

  getSelections(track?: string, date?: string, raceNumber?: number): Observable<any[]> {
    let url = `${this.apiUrl}/selections`;
    const params = [];
    if (track && date) {
      params.push(`track=${track}`);
      params.push(`date=${date}`);
    }
    if (raceNumber) {
      params.push(`race_number=${raceNumber}`);
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    return this.http.get<any[]>(url);
  }

  saveSelection(selection: { track: string, date: string, race_number: number, horse_number: number, selected: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/selections`, selection);
  }

  clearSelections(track: string, date: string, raceNumber: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/selections?track=${track}&date=${date}&race_number=${raceNumber}`);
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
