import sharedModalsHtml from './partials/shared-modals.html?raw';

/**
 * Inject shared size/quick-view/notification modals once per page (TASK 014).
 * Filters modal stays catalog-only in catalog.html.
 */
export function injectSharedModals() {
  if (document.getElementById('size-guide-modal')) return;

  const mount = document.createElement('div');
  mount.id = 'shared-modals-root';
  mount.innerHTML = sharedModalsHtml;
  document.body.appendChild(mount);
}
