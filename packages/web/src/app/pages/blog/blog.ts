import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Blog as BlogService } from '../../blog/blog';
import { I18nService } from '@froment/ui';
import { Icon } from '@froment/ui/icon';
import { LocalizedDatePipe } from '@froment/ui/localized-date';
@Component({
  host: { class: 'page-container' },
  selector: 'app-blog',
  imports: [Icon, LocalizedDatePipe, RouterLink],
  templateUrl: './blog.html',
  styleUrl: './blog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Blog {
  protected readonly blog = inject(BlogService);
  protected readonly i18n = inject(I18nService);
}
