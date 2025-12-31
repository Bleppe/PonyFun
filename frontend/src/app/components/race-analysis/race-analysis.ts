import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { RaceService } from '../../services/race';

@Component({
  selector: 'app-race-analysis',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './race-analysis.html',
  styleUrl: './race-analysis.css',
})
export class RaceAnalysisComponent implements OnInit {
  analysis: any[] = [];
  raceId: number | null = null;
  track: string | null = null;
  date: string | null = null;
  loading = false;
  activeTooltip: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private raceService: RaceService,
    private router: Router
  ) {
    // Close tooltip when clicking anywhere on the document
    if (typeof document !== 'undefined') {
      document.addEventListener('click', () => {
        this.activeTooltip = null;
      });
    }
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.raceId = +idParam;
        this.refreshData();
      }
    });

    this.route.queryParamMap.subscribe(params => {
      this.track = params.get('track');
      this.date = params.get('date');
      this.refreshData();
    });
  }

  refreshData(): void {
    if (this.raceId && this.track && this.date) {
      this.loadAnalysis(this.track, this.date);
    }
  }

  loadAnalysis(track: string, date: string): void {
    this.loading = true;
    this.raceService.getRaceAnalysis(this.raceId!, track, date).subscribe({
      next: (data) => {
        this.analysis = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching analysis', err);
        this.loading = false;
      }
    });
  }

  goToPreviousRace(): void {
    if (this.raceId && this.raceId > 1) {
      this.navigateToRace(this.raceId - 1);
    }
  }

  goToNextRace(): void {
    if (this.raceId && this.raceId < 8) {
      this.navigateToRace(this.raceId + 1);
    }
  }

  toggleTooltip(event: Event, index: number): void {
    event.stopPropagation();
    this.activeTooltip = this.activeTooltip === index ? null : index;
  }

  private navigateToRace(newId: number): void {
    this.router.navigate(['/analysis', newId], {
      queryParams: { track: this.track, date: this.date }
    });
  }
}
