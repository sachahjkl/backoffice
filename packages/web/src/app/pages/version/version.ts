import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { type DeploymentMetadataValue } from '@froment/contracts';
import { RouterLink } from '@angular/router';

import { I18nService } from '@froment/ui';
import { Notice } from '@shared/notice/notice';
import { EnvironmentStatus } from '@shared/environment-status/environment-status';
import { RuntimeConfiguration } from '@froment/ui';
import { VersionApi } from './version-api';

type VersionState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-version',
  imports: [EnvironmentStatus, Notice, RouterLink],
  templateUrl: './version.html',
  styleUrl: './version.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Version {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(VersionApi);
  protected readonly state = signal<VersionState>('loading');
  protected readonly metadata = signal<DeploymentMetadataValue | undefined>(undefined);
  private readonly runtime = inject(RuntimeConfiguration);
  protected readonly commitUrl = computed(() => this.runtime.commitUrl(this.metadata()?.commit));

  constructor() {
    afterNextRender(() => void this.load());
  }

  private async load(): Promise<void> {
    try {
      this.metadata.set(await this.api.get());
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }
}
