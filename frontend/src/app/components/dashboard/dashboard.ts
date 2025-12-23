import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RaceService } from '../../services/race';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  groupedRaces: { [key: string]: any[] } = {};
  upcomingRaces: any[] = [];
  loading = false;
  source: string = 'atg';

  constructor(private raceService: RaceService) { }

  ngOnInit(): void {
    this.loadRaces();
  }

  loadRaces(): void {
    this.loading = true;
    this.raceService.getUpcomingRaces().subscribe({
      next: (data) => {
        this.upcomingRaces = data;
        this.groupRaces(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching races', err);
        this.loading = false;
      }
    });
  }

  groupRaces(data: any[]): void {
    this.groupedRaces = data.reduce((acc: any, race: any) => {
      const key = `${race.date} - ${race.track}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(race);
      return acc;
    }, {});
  }

  getGroupKeys(): string[] {
    return Object.keys(this.groupedRaces).sort((a, b) => a.localeCompare(b));
  }

  triggerScrape(): void {
    this.loading = true;
    // Use 'both' to get ATG structure + SH enrichment
    this.raceService.scrapeData('both').subscribe(() => {
      this.loadRaces();
    });
  }

  triggerScrapeAll(): void {
    this.loading = true;
    this.raceService.scrapeAll().subscribe(() => {
      this.loadRaces();
    });
  }

  toggleGroup(key: string): void {
    if (this.raceService.expandedGroups.has(key)) {
      this.raceService.expandedGroups.delete(key);
    } else {
      this.raceService.expandedGroups.add(key);
    }
  }

  isGroupExpanded(key: string): boolean {
    return this.raceService.expandedGroups.has(key);
  }
}
