import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavigationProgress } from '../navigation-progress/navigation-progress';

@Component({
  selector: 'app-site-header',
  imports: [NavigationProgress, RouterLink],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {}
