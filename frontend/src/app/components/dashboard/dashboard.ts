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
  participants: number = 7;
  selections: any[] = [];

  constructor(private raceService: RaceService) { }

  ngOnInit(): void {
    this.loadRaces();
    this.loadSelections();
  }

  loadSelections(): void {
    this.raceService.getSelections().subscribe({
      next: (data) => {
        this.selections = data;
      },
      error: (err) => console.error('Error loading selections', err)
    });
  }

  getSelectedHorses(track: string, date: string, raceNumber: number): number[] {
    return this.selections
      .filter(s => s.track === track && s.date === date && s.race_number === raceNumber)
      .map(s => s.horse_number)
      .sort((a, b) => a - b);
  }

  calculateSystemCost(key: string): number {
    const races = this.groupedRaces[key];
    if (!races || races.length === 0) return 0;

    let combinations = 1;
    // Optimize: Pre-calculate or map to keys to avoid repeated filtering if perf issues arise.
    // For now, simple iteration is fine.

    for (const race of races) {
      const count = this.getSelectedHorses(race.track, race.date, race.race_number).length;
      if (count === 0) {
        // If any leg has 0 selections, the system is invalid (cannot be submitted), so cost is technically 0.
        // Or should we assume 1 for missing legs to show potential cost? 
        // Standard betting system calculators return 0 if the system is incomplete.
        return 0;
      }
      combinations *= count;
    }

    return combinations * 0.5;
  }

  loadRaces(): void {
    this.loading = true;
    this.raceService.getUpcomingRaces().subscribe({
      next: (data) => {
        this.upcomingRaces = data;
        this.groupRaces(data);
        this.loading = false;
        // Refresh selections when races load effectively? 
        // No, independent. But good to refresh if new races appear?
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

  cleanDatabase(): void {
    const confirmed = confirm('⚠️ Are you sure you want to delete all race data?\n\nThis will permanently remove:\n• All races\n• All horses\n• All riders\n• All historical data\n\nThis action cannot be undone!');

    if (confirmed) {
      this.loading = true;
      this.raceService.cleanDatabase().subscribe({
        next: () => {
          console.log('Database cleaned successfully');
          this.loadRaces();
        },
        error: (err) => {
          console.error('Error cleaning database', err);
          alert('Error cleaning database: ' + err.message);
          this.loading = false;
        }
      });
    }
  }
}
