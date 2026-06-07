export const koBaseSettingsRecovery = {
      title: "파일 복원",
      refresh: "다시 확인",
      steps: {
        safeTitle: "먼저 안전 복사본을 만듭니다",
        safeDescription:
          "현재 상태를 따로 저장해 두기 때문에 실패해도 원래 상태로 되돌릴 수 있습니다.",
        restoreTitle: "최근 저장분을 되살립니다",
        restoreDescription:
          "앱 종료 직전 메인 파일에 아직 합쳐지지 않은 최근 저장 내용을 다시 붙입니다.",
        rollbackTitle: "문제가 있으면 자동으로 되돌립니다",
        rollbackDescription:
          "검사에서 이상이 보이면 방금 만든 안전 복사본으로 자동 복구합니다.",
      },
      dryRun: "먼저 안전 백업만 만들기",
      run: "최근 저장분 복원하기",
      running: "복원 중...",
      failed: "복원 실행에 실패했습니다.",
      error: "복원 중 오류가 발생했습니다.",
      lastChecked: "마지막 확인",
      unavailableHint:
        "지금은 되살릴 최근 저장분이 보이지 않습니다. 보통 .wal 파일이 없을 때 이렇게 표시됩니다.",
      file: {
        database: "데이터베이스",
        wal: "WAL 로그",
        shm: "공유 메모리",
        present: "파일 있음",
        missing: "파일 없음",
      },
      hero: {
        checkingBadge: "확인 중",
        checkingTitle: "복원할 최근 저장분을 확인하고 있습니다",
        checkingDescription:
          "잠시만 기다리면 Luie가 복원 가능한 저장 흔적이 남아 있는지 자동으로 확인합니다.",
        readyBadge: "복원 가능",
        readyTitle: "최근 저장분을 되살릴 수 있어요",
        readyDescription:
          "앱이 메인 파일에 아직 합치지 못한 최근 저장분을 찾았습니다. 아래 복원 버튼을 누르면 Luie가 자동으로 안전 복구를 시도합니다.",
        emptyBadge: "지금은 복원할 내용 없음",
        emptyTitle: "지금 복원할 최근 저장분이 보이지 않습니다",
        emptyDescription:
          "최근 저장 흔적(.wal)을 찾지 못했습니다. 지금은 복원 버튼을 눌러도 되살릴 내용이 없습니다.",
        blockedBadge: "확인 필요",
        dbMissingTitle: "복원 대상 파일을 찾지 못했습니다",
        dbMissingDescription:
          "앱 데이터 파일을 먼저 확인해야 합니다. 이 상태에서는 복원을 진행하지 않습니다.",
      },
      dialog: {
        checkingTitle: "복원할 최근 저장분을 확인하고 있어요",
        checkingDescription:
          "Luie가 방금 종료 직전의 저장 흔적이 남아 있는지 살펴보고 있습니다.",
        readyTitle: "저장되지 않은 원고를 되살릴 수 있습니다",
        readyDescription:
          "Luie가 비정상 종료 직전의 저장 흔적을 발견했습니다. 지금 복원하면 가장 최근에 남아 있던 저장분을 다시 붙입니다.",
        emptyTitle: "지금 복원할 저장 흔적은 없습니다",
        emptyDescription:
          "현재는 되살릴 최근 저장 흔적을 찾지 못했습니다. 필요하면 다시 확인해 볼 수 있습니다.",
        blockedTitle: "복원에 필요한 파일을 찾지 못했습니다",
        blockedDescription:
          "복원 대상 데이터 파일이 먼저 정상적으로 보여야 합니다. 이 상태에서는 복원을 진행하지 않습니다.",
      },
      scope: {
        currentProject: "지금 열려 있는 원고",
        noOpenProject: "열려 있는 원고 없음",
        library: "복원 대상",
        projectCount: "로컬 원고 {{count}}개",
        libraryDescription:
          "이 기능은 현재 프로젝트 하나가 아니라, 이 기기에 저장된 Luie 로컬 보관함 전체를 대상으로 합니다.",
        preview: "같이 확인되는 원고",
        noProjects: "불러온 로컬 원고 목록이 없습니다.",
        moreProjects: "외 {{count}}개",
      },
      summary: {
        current: "현재 원고",
        currentSavedAt: "현재 파일 기준 저장 시각:",
        recoverable: "복원 가능 저장분",
        backupSavedAt: "복원 가능 저장 시각:",
        preview: "복원될 내용 미리보기",
        projectChapter: "{{projectTitle}} · {{chapterTitle}}",
        unknownBackup: "복원 가능한 저장분",
      },
      actionTitle: "복원 버튼을 누르면 Luie가 자동으로 처리합니다",
      actionDescription:
        "어려운 작업은 Luie가 대신합니다. 아래 과정은 자동으로 진행되며, 문제가 생기면 원래 상태로 되돌립니다.",
      actions: {
        ignore: "무시하고 닫기",
        restore: "백업본으로 복원",
      },
      resultTitle: "방금 실행 결과",
      resultBackupOnly: "안전 백업 완료",
      resultApplied: "복원 시도 완료",
      technicalTitle: "기술 정보",
      technicalDescription:
        "경로, 파일 크기, 복원 백업 위치 같은 상세 정보를 보고 싶을 때만 열어 보세요.",
      fields: {
        path: "경로",
        size: "크기",
        updatedAt: "수정 시각",
        notFound: "파일 없음",
        backupDir: "생성된 백업",
        backupRootDir: "백업 보관 위치",
        latestBackupDir: "최근 생성된 백업",
        checkpoint: "체크포인트 결과",
        integrity: "무결성 검사",
      },
      messages: {
        backupCreated:
          "안전 백업을 만들었습니다. 이제 원하면 실제 복원을 진행할 수 있습니다.",
        recoveryCompleted:
          "최근 저장분 복원이 끝났습니다. Luie가 자동으로 무결성 검사까지 마쳤습니다.",
        walMissing:
          "지금은 되살릴 최근 저장분이 보이지 않습니다. 복원 가능한 .wal 파일을 찾지 못했습니다.",
        walBusy:
          "다른 프로세스가 아직 복원 파일을 사용 중입니다. Luie를 완전히 종료한 뒤 다시 시도해 주세요.",
        integrityFailed: "무결성 검사에서 오류가 발견되었습니다: {{detail}}",
        statusLoadFailed: "복원 상태를 불러오지 못했습니다.",
      },
    };
