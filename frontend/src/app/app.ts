import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VERSION_INFO } from '../version';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
  protected readonly version = VERSION_INFO.version;
}
