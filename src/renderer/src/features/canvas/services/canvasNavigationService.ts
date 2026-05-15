/**
 * Canvas → Editor 네비게이션. PRD §11.3 / §17.1 / §18.4.
 *
 * Selection Detail의 [Open in Editor]가 눌리면 이 서비스를 통해
 * manuscript editor로 라우팅한다. 컴포넌트는 service만 부르고,
 * 실제 chapter store/editor store 호출은 여기 한 곳으로 모은다.
 *
 * Phase 0a에서는 stub. Phase 3에서 chapterNavigation 서비스에 위임한다
 * (`features/workspace/services/chapterNavigation`).
 */

export interface CanvasOpenSourceRequest {
  chapterId: string;
  /** Editor 안의 문자 위치(선택 사항). PRD §17.1 openSourceRequested. */
  position?: number;
}

export interface CanvasNavigationService {
  openInEditor(request: CanvasOpenSourceRequest): Promise<void>;
}

class StubCanvasNavigationService implements CanvasNavigationService {
  async openInEditor(_request: CanvasOpenSourceRequest): Promise<void> {
    // Phase 3에서 chapterNavigation.openChapter(chapterId, { position }) 등으로
    // 위임. 지금은 의도적 no-op.
  }
}

let activeService: CanvasNavigationService = new StubCanvasNavigationService();

export function getCanvasNavigationService(): CanvasNavigationService {
  return activeService;
}

export function __setCanvasNavigationServiceForTesting(
  service: CanvasNavigationService,
): void {
  activeService = service;
}
