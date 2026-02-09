# HWPX Export 분석 및 수정 계획

## 📋 요약

현재 Luie가 생성한 HWPX 파일(\`일상\`)은 깨지고, 한컴오피س가 생성한 파일(\`format\`)은 정상 작동함.  
두 파일의 구조적 차이를 분석하고 올바른 HWPX 생성을 위한 수정 계획을 수립함.

---

## 🔍 1단계: 파일 구조 비교

### 1.1. 디렉토리 구성 차이

| 구분 | 일상 (깨짐) | format (정상) |
|------|-------------|---------------|
| **mimetype** | ✅ 존재 | ✅ 존재 |
| **version.xml** | ✅ 존재 | ✅ 존재 |
| **settings.xml** | ✅ 존재 | ✅ 존재 |
| **META-INF/** | ✅ 3파일 | ✅ 3파일 |
| **Contents/** | ✅ 3파일 | ✅ 3파일 |
| **Preview/** | ✅ 존재 | ✅ 존재 |
| **BinData/** | ❌ 없음 | ✅ 존재 (image1-5.bmp) |

### 1.2. version.xml 차이

```xml
<!-- 일상 (Luie 생성) -->
<hv:HCFVersion ... os="10" application="Luie" appVersion="1.0.0"/>

<!-- format (한컴오피스) -->
<hv:HCFVersion ... os="1" application="Hancom Office Hangul" 
  appVersion="12, 0, 0, 4204 WIN32LEWindows_10"/>
```

**차이점:**
- `os` 값: 10 vs 1
- `application`: "Luie" vs "Hancom Office Hangul"
- `appVersion`: 간단한 버전 vs 상세한 빌드 정보

### 1.3. settings.xml 차이

```xml
<!-- 일상 -->
<ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/>

<!-- format -->
<ha:CaretPosition listIDRef="0" paraIDRef="5" pos="0"/>
```

**차이점:** `paraIDRef` 값이 다름 (0 vs 5)

---

## 🚨 2단계: META-INF 핵심 차이

### 2.1. manifest.xml (치명적 차이!)

```xml
<!-- 일상: 전체 파일 리스트 포함 -->
<manifest xmlns="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <file-entry media-type="application/hwp+zip" full-path="/"/>
  <file-entry media-type="application/xml" full-path="version.xml"/>
  <file-entry media-type="application/xml" full-path="settings.xml"/>
  <file-entry ... full-path="Contents/header.xml"/>
  <file-entry ... full-path="Contents/section0.xml"/>
  <file-entry ... full-path="Contents/content.hpf"/>
</manifest>

<!-- format: 거의 비어있음! -->
<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>
```

**⚠️ 중요:** 작동하는 format은 manifest가 거의 비어있음!

### 2.2. container.xml

```xml
<!-- 일상: 간단한 구조 -->
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="Contents/content.hpf" 
      media-type="application/vnd.hancom.hwpx.content+hpf"/>
  </rootfiles>
</container>

<!-- format: 상세한 구조 -->
<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" 
  xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf">
  <ocf:rootfiles>
    <ocf:rootfile full-path="Contents/content.hpf" 
      media-type="application/hwpml-package+xml"/>
    <ocf:rootfile full-path="Preview/PrvText.txt" 
      media-type="text/plain"/>
    <ocf:rootfile full-path="META-INF/container.rdf" 
      media-type="application/rdf+xml"/>
  </ocf:rootfiles>
</ocf:container>
```

**주요 차이:**
- namespace: `xmlns` vs `xmlns:ocf` + `xmlns:hpf`
- rootfile 수: 1개 vs 3개 (content.hpf, PrvText.txt, container.rdf)
- media-type: 다름

### 2.3. container.rdf

```xml
<!-- 일상: 단순 -->
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="Contents/content.hpf">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpx/2010/relationships/content"/>
  </rdf:Description>
</rdf:RDF>

<!-- format: 상세 -->
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="">
    <ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" 
      rdf:resource="Contents/header.xml"/>
  </rdf:Description>
  <rdf:Description rdf:about="Contents/header.xml">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/>
  </rdf:Description>
  <rdf:Description rdf:about="">
    <ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" 
      rdf:resource="Contents/section0.xml"/>
  </rdf:Description>
  <rdf:Description rdf:about="Contents/section0.xml">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/>
  </rdf:Description>
  <rdf:Description rdf:about="">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/>
  </rdf:Description>
</rdf:RDF>
```

---

## 📄 3단계: Contents/ 핵심 차이

### 3.1. content.hpf

```xml
<!-- 일상: 간단 -->
<opf:package xmlns:opf="..." xmlns:dc="..." unique-identifier="id" version="2.0">
  <opf:metadata>
    <dc:title>일상</dc:title>
    <dc:creator>Luie</dc:creator>
    ...
  </opf:metadata>
  <opf:manifest>
    <opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>
    <opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>
    <opf:item id="settings" href="settings.xml" media-type="application/xml"/>
  </opf:manifest>
  <opf:spine>
    <opf:itemref idref="section0"/>
  </opf:spine>
</opf:package>

<!-- format: 복잡 + 13개 namespace -->
<opf:package xmlns:ha="..." xmlns:hp="..." xmlns:hp10="..." 
  xmlns:hs="..." xmlns:hc="..." xmlns:hh="..." xmlns:hhs="..." 
  xmlns:hm="..." xmlns:hpf="..." xmlns:dc="..." xmlns:opf="..." 
  xmlns:ooxmlchart="..." xmlns:hwpunitchar="..." xmlns:epub="..." 
  xmlns:config="..." version="" unique-identifier="" id="">
  <opf:metadata>
    <opf:title/>
    <opf:language>ko</opf:language>
    <opf:meta name="creator" content="text">user</opf:meta>
    <opf:meta name="CreatedDate" content="text">2025-08-27T06:15:55Z</opf:meta>
    ...
  </opf:metadata>
  <opf:manifest>
    <opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>
    <opf:item id="image1" href="BinData/image1.bmp" media-type="image/bmp" isEmbeded="1"/>
    ...
    <opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>
    <opf:item id="settings" href="settings.xml" media-type="application/xml"/>
  </opf:manifest>
  <opf:spine>
    <opf:itemref idref="header" linear="yes"/>
    <opf:itemref idref="section0" linear="yes"/>
  </opf:spine>
</opf:package>
```

### 3.2. header.xml (심각한 차이!)

| 항목 | 일상 | format |
|------|------|--------|
| **네임스페이스** | 15개 | 15개 (동일) |
| **borderFills** | itemCnt="2" | itemCnt="3" |
| **charProperties** | itemCnt="1" ❌ | itemCnt="20" ✅ |
| **tabProperties** | itemCnt="1" | itemCnt="3" |
| **numberings** | ❌ 없음! | itemCnt="1" ✅ |
| **paraProperties** | itemCnt="1" ❌ | itemCnt="21" ✅ |
| **styles** | itemCnt="1" ❌ | itemCnt="22" ✅ |

**✅ 핵심 문제:** 일상은 기본 스타일 정의가 거의 없음!

### 3.3. section0.xml (구조적 차이)

```xml
<!-- 일상: 매우 단순 -->
<hs:sec xmlns:hs="..." xmlns:hp="..." xmlns:hc="..." 
  id="0" textDirection="HORIZONTAL" ...>
  <hs:secPr>
    <hc:pgSz><hc:width>59528</hc:width><hc:height>84188</hc:height></hc:pgSz>
    <hc:pageMargin left="5669" right="5669" top="5669" bottom="4252" .../>
    ...
  </hs:secPr>
  <hp:p paraPrIDRef="0" styleIDRef="0" ...>
    <hp:run charPrIDRef="0"><hp:t>일상</hp:t></hp:run>
  </hp:p>
  ...
</hs:sec>

<!-- format: 매우 복잡 -->
<hs:sec ...>
  <!-- 첫 문단에 secPr을 내포 -->
  <hp:p id="3121190098" paraPrIDRef="20" styleIDRef="0" ...>
    <hp:run charPrIDRef="9">
      <hp:secPr id="" textDirection="HORIZONTAL" ...>
        <hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>
        <hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>
        ...
      </hp:secPr>
      <hp:ctrl>
        <hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" .../>
      </hp:ctrl>
    </hp:run>
    <hp:run charPrIDRef="9"><hp:t>경북소프트웨어마이스터고...</hp:t></hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" .../>
    </hp:linesegarray>
  </hp:p>
  <!-- 표, 이미지, 복잡한 레이아웃 포함 -->
  <hp:p ...>
    <hp:run charPrIDRef="0">
      <hp:tbl id="1937235563" ...>
        <hp:tr><hp:tc>...</hp:tc></hp:tr>
        ...
      </hp:tbl>
    </hp:run>
  </hp:p>
  ...
</hs:sec>
```

**차이점:**
- 일상: 기본적인 secPr만, 단순한 문단들
- format: 첫 문단에 상세한 secPr, linesegarray 포함, 표/이미지/복잡한 레이아웃 포함

---

## 📚 4단계: HWPX 표준 정보 (KS X 6101 - OWPML)

### 4.1. HWPX란?

- **표준:** KS X 6101 (OWPML - Open Word-Processor Markup Language)
- **구조:** ZIP + XML 기반 개방형 문서 포맷
- **제정일:** 2011년 12월 30일

### 4.2. 주요 구성요소

| 파일/폴더 | 역할 |
|-----------|------|
| `mimetype` | 파일 형식 식별자: `application/hwp+zip` |
| `version.xml` | OWPML 버전 정보, 저장 환경 정보 |
| `settings.xml` | 커서 위치, 외부 설정 요소 |
| `META-INF/manifest.xml` | 패키징 파일 목록 (ODF 표준) |
| `META-INF/container.xml` | 루트 파일 정보 |
| `META-INF/container.rdf` | RDF 메타데이터 |
| `BinData/` | 이미지, OLE 개체 등 바이너리 파일 |
| `Contents/content.hpf` | OPF 표준: metadata, manifest, spine |
| `Contents/header.xml` | 서식 정보 (폰트, 스타일, 문단/글자 속성) |
| `Contents/section0.xml` | 본문 내용 (문단, 표, 이미지 등) |

### 4.3. header.xml 구조 (KS X 6101)

```xml
<hh:head secCnt="1">
  <hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>
  <hh:refList>
    <hh:fontfaces itemCnt="7">...</hh:fontfaces>
    <hh:borderFills itemCnt="2">...</hh:borderFills>
    <hh:charProperties itemCnt="7">...</hh:charProperties>
    <hh:tabProperties itemCnt="3">...</hh:tabProperties>
    <hh:numberings itemCnt="1">...</hh:numberings>     <!-- 번호 문단 모양 -->
    <hh:bullets itemCnt="1">...</hh:bullets>           <!-- 글머리표 -->
    <hh:paraProperties itemCnt="20">...</hh:paraProperties>
    <hh:styles itemCnt="22">...</hh:styles>
    <hh:memoProperties itemCnt="1">...</hh:memoProperties>
  </hh:refList>
  <hh:compatibleDocument targetProgram="HWP201X">
    <hh:layoutCompatibility/>
  </hh:compatibleDocument>
  <hh:docOption>...</hh:docOption>
  <hh:trackchageConfig flags="56"/>
</hh:head>
```

---

## 🎯 5단계: Definition of Done (DoD) - TODO 항목

### ✅ Phase 1: META-INF 수정

#### 1.1. manifest.xml 수정
- [x] **현재:** 일상처럼 전체 파일 리스트 포함
- [x] **목표:** format처럼 빈 manifest로 변경
```typescript
private generateManifestXml(): string {
  return this.compressXml(`<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>`);
}
```

#### 1.2. container.xml 수정
- [x] **현재:** 단순 구조, 1개 rootfile
- [x] **목표:** format처럼 3개 rootfile + namespace 추가
```typescript
private generateContainerXml(): string {
  return this.compressXml(`<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" 
  xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf">
  <ocf:rootfiles>
    <ocf:rootfile full-path="Contents/content.hpf" 
      media-type="application/hwpml-package+xml"/>
    <ocf:rootfile full-path="Preview/PrvText.txt" 
      media-type="text/plain"/>
    <ocf:rootfile full-path="META-INF/container.rdf" 
      media-type="application/rdf+xml"/>
  </ocf:rootfiles>
</ocf:container>`);
}
```

#### 1.3. container.rdf 수정
- [x] **현재:** 단순 content.hpf 참조만
- [x] **목표:** header.xml, section0.xml 상세 정보 추가
```typescript
private generateContainerRdf(): string {
  return this.compressXml(`<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about="">
    <ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" 
      rdf:resource="Contents/header.xml"/>
  </rdf:Description>
  <rdf:Description rdf:about="Contents/header.xml">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#HeaderFile"/>
  </rdf:Description>
  <rdf:Description rdf:about="">
    <ns0:hasPart xmlns:ns0="http://www.hancom.co.kr/hwpml/2016/meta/pkg#" 
      rdf:resource="Contents/section0.xml"/>
  </rdf:Description>
  <rdf:Description rdf:about="Contents/section0.xml">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#SectionFile"/>
  </rdf:Description>
  <rdf:Description rdf:about="">
    <rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/>
  </rdf:Description>
</rdf:RDF>`);
}
```

### ✅ Phase 2: Contents/content.hpf 수정

#### 2.1. namespace 13개로 확장
- [x] **현재:** 3개 namespace만
- [x] **목표:** 한컴 표준 13개 namespace 추가
```typescript
private generateContentHpf(options: Required<ExportOptions>): string {
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<opf:package 
  xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" 
  xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" 
  xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" 
  xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" 
  xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" 
  xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" 
  xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" 
  xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" 
  xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" 
  xmlns:dc="http://purl.org/dc/elements/1.1/" 
  xmlns:opf="http://www.idpf.org/2007/opf/" 
  xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" 
  xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" 
  xmlns:epub="http://www.idpf.org/2007/ops" 
  xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0" 
  version="" unique-identifier="" id="">
  ...
</opf:package>`;
  return this.compressXml(xml);
}
```

#### 2.2. metadata 상세화
- [x] **현재:** 간단한 title, creator만
- [x] **목표:** opf:meta 형식으로 CreatedDate, ModifiedDate 등 추가

#### 2.3. spine에 header 추가
- [x] **현재:** section0만
- [x] **목표:** header + section0
```typescript
<opf:spine>
  <opf:itemref idref="header" linear="yes"/>
  <opf:itemref idref="section0" linear="yes"/>
</opf:spine>
```

### ✅ Phase 3: Contents/header.xml 대폭 강화 (핵심!)

#### 3.1. charProperties 확장
- [x] **현재:** itemCnt="1", 기본 charPr 1개만
- [x] **목표:** itemCnt="10" 이상, 다양한 폰트 크기/색상/스타일

```typescript
// 기본 (id=0) + 다양한 크기/색상/스타일 조합
<hh:charProperties itemCnt="20">
  <hh:charPr id="0" height="1000" textColor="#000000" .../>  <!-- 기본 -->
  <hh:charPr id="1" height="1000" textColor="#000000" .../>  <!-- 고정폭 -->
  <hh:charPr id="2" height="900" textColor="#000000" .../>   <!-- 작은 글자 -->
  <hh:charPr id="5" height="1600" textColor="#2E74B5" .../>  <!-- 제목용 -->
  <hh:charPr id="9" height="1600" textColor="#000000" ...>
    <hh:bold/>  <!-- 굵게 -->
  </hh:charPr>
  ...
</hh:charProperties>
```

#### 3.2. numberings 추가 (필수!)
- [x] **현재:** ❌ 없음
- [x] **목표:** 기본 numbering 정의 추가

```typescript
<hh:numberings itemCnt="1">
  <hh:numbering id="1" start="0">
    <hh:paraHead start="1" level="1" align="LEFT" useInstWidth="1" 
      autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" 
      numFormat="DIGIT" charPrIDRef="4294967295" checkable="0">^1.</hh:paraHead>
    <hh:paraHead start="1" level="2" align="LEFT" useInstWidth="1" 
      autoIndent="1" widthAdjust="0" textOffsetType="PERCENT" textOffset="50" 
      numFormat="HANGUL_SYLLABLE" charPrIDRef="4294967295" checkable="0">^2.</hh:paraHead>
    <!-- ... level 3-10 -->
  </hh:numbering>
</hh:numberings>
```

#### 3.3. paraProperties 확장
- [x] **현재:** itemCnt="1", 기본 paraPr 1개만
- [x] **목표:** itemCnt="10" 이상, 다양한 정렬/들여쓰기/줄간격

```typescript
<hh:paraProperties itemCnt="21">
  <hh:paraPr id="0" ...><!-- 바탕글 --></hh:paraPr>
  <hh:paraPr id="1" ...><!-- 본문 --></hh:paraPr>
  <hh:paraPr id="2" ...><!-- 개요 1 --></hh:paraPr>
  ...
  <hh:paraPr id="20" ...><!-- 캡션 --></hh:paraPr>
</hh:paraProperties>
```

#### 3.4. styles 확장
- [x] **현재:** itemCnt="1", "바탕글" 1개만
- [x] **목표:** itemCnt="10" 이상, 표준 스타일 세트

```typescript
<hh:styles itemCnt="22">
  <hh:style id="0" type="PARA" name="바탕글" engName="Normal" .../>
  <hh:style id="1" type="PARA" name="본문" engName="Body" .../>
  <hh:style id="2" type="PARA" name="개요 1" engName="Outline 1" .../>
  ...
  <hh:style id="21" type="PARA" name="캡션" engName="Caption" .../>
</hh:styles>
```

#### 3.5. borderFills 확장
- [x] **현재:** itemCnt="2"
- [x] **목표:** itemCnt="3" 이상 (표 테두리용 추가)

### ✅ Phase 4: Contents/section0.xml 구조 개선

#### 4.1. 첫 문단에 secPr 내포 (한컴 방식)
- [x] **현재:** `<hs:sec>` 바로 아래 `<hs:secPr>` 배치
- [x] **목표:** 첫 `<hp:p>` 내 `<hp:run>` 안에 `<hp:secPr>` 배치

```typescript
<hs:sec>
  <hp:p id="3121190098" paraPrIDRef="20" styleIDRef="0" ...>
    <hp:run charPrIDRef="9">
      <hp:secPr id="" textDirection="HORIZONTAL" ...>
        <hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/>
        <hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/>
        <hp:visibility hideFirstHeader="0" hideFirstFooter="0" .../>
        <hp:lineNumberShape restartType="0" countBy="0" .../>
        <hp:pagePr landscape="NARROWLY" width="59528" height="84186" gutterType="LEFT_ONLY">
          <hp:margin header="4252" footer="4252" gutter="0" left="8504" 
            right="8504" top="2834" bottom="0"/>
        </hp:pagePr>
        <hp:footNotePr>...</hp:footNotePr>
        <hp:endNotePr>...</hp:endNotePr>
        <hp:pageBorderFill type="BOTH" borderFillIDRef="1" ...>
          <hp:offset left="1417" right="1417" top="1417" bottom="1417"/>
        </hp:pageBorderFill>
        <!-- ... EVEN, ODD도 추가 -->
      </hp:secPr>
      <hp:ctrl>
        <hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" 
          sameSz="1" sameGap="0"/>
      </hp:ctrl>
    </hp:run>
    <hp:run charPrIDRef="9"><hp:t>제목</hp:t></hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" .../>
    </hp:linesegarray>
  </hp:p>
  <!-- 이후 본문 문단들 -->
</hs:sec>
```

#### 4.2. linesegarray 추가
- [x] **현재:** 없음
- [x] **목표:** 모든 `<hp:p>`에 `<hp:linesegarray>` 추가 (레이아웃 정보)

#### 4.3. 문단 ID 자동 생성
- [x] **현재:** `id="0"` 고정
- [x] **목표:** 각 문단마다 고유 ID 부여

### ✅ Phase 5: version.xml 및 기타 수정

#### 5.1. version.xml 표준화
- [x] **os:** "10" → "1"로 변경 (Windows 기본값)
- [ ] **application:** "Luie" 유지 또는 "HWPX Generator" 등으로 변경
- [ ] **appVersion:** 유지 또는 더 상세하게

#### 5.2. settings.xml
- [ ] **paraIDRef:** 마지막 문단 ID로 설정 (동적 계산)

#### 5.3. Preview/PrvText.txt 생성
- [ ] **현재:** 생성되지만 content.hpf manifest에 없음
- [ ] **목표:** manifest에 추가하고 rootfile로 등록

### ✅ Phase 6: 템플릿 기반 모드 개선

#### 6.1. 템플릿에서 header.xml 완전히 복사
- [ ] 템플릿의 모든 charProperties, paraProperties, styles 유지
- [ ] title/date만 업데이트

#### 6.2. 템플릿에서 section0.xml 구조 유지
- [ ] 템플릿의 secPr 설정 유지
- [ ] 본문 내용만 교체

---

## 🧪 6단계: 테스트 계획

### 6.1. 단위 테스트
- [ ] META-INF 파일 생성 테스트
- [ ] header.xml 스타일 수 검증
- [ ] section0.xml 구조 검증

### 6.2. 통합 테스트
- [ ] 간단한 텍스트 문서 생성 → 한컴오피스에서 열기
- [ ] 제목 + 본문 문서 생성 → 검증
- [ ] 템플릿 기반 생성 → 검증

### 6.3. 호환성 테스트
- [ ] 한컴오피스 NEO 테스트
- [ ] 한컴오피스 2022 테스트
- [ ] 한컴오피스 뷰어 테스트

---

## 📌 7단계: 우선순위

### 🔴 Critical (즉시 수정 필요)
1. ✅ Phase 3.2: numberings 추가
2. ✅ Phase 3.3: paraProperties 확장
3. ✅ Phase 3.4: styles 확장
4. ✅ Phase 1.2: container.xml 수정 (rootfile 3개)
5. ✅ Phase 1.3: container.rdf 상세화

### 🟡 High (우선 순위 높음)
6. ✅ Phase 3.1: charProperties 확장
7. ✅ Phase 2.1: content.hpf namespace 확장
8. ✅ Phase 4.1: section0.xml secPr 구조 변경
9. ✅ Phase 1.1: manifest.xml 빈 파일로 변경

### 🟢 Medium (일반)
10. ✅ Phase 4.2: linesegarray 추가
11. ✅ Phase 2.2: metadata 상세화
12. ✅ Phase 5.1: version.xml 표준화

### 🔵 Low (낮은 우선순위)
13. ✅ Phase 4.3: 문단 ID 자동 생성
14. ✅ Phase 5.2: settings.xml paraIDRef 동적 설정

---

## 💡 8단계: 참고 자료

1. **KS X 6101 표준 문서** (e-나라표준인증)
2. **한컴 공식 문서:** https://www.hancom.com/support/downloadCenter/hwpOwpml
3. **한컴테크 블로그:** https://tech.hancom.com/hwpxformat/
4. **한컴테크 Python 파싱:** https://tech.hancom.com/python-hwpx-parsing-1/
5. **실제 작동하는 HWPX:** `/assets/documents/format/`

---

## ✅ 체크리스트

실행 전 확인사항:
- [ ] 모든 XML이 한 줄로 압축되는지 (compressXml)
- [ ] mimetype이 비압축(STORE)으로 저장되는지
- [ ] 파일 순서: mimetype → version.xml → META-INF → Contents
- [ ] UTF-8 인코딩 확인
- [ ] standalone="yes" 속성 확인

실행 후 검증:
- [ ] .hwpx → .zip 변경 후 압축 해제 가능
- [ ] 한컴오피스에서 정상 열림
- [ ] 모든 텍스트 정상 표시
- [ ] 스타일/서식 정상 적용

---

## 📝 변경 이력

- **2026-02-09:** 초기 분석 완료, DoD 작성
- **진행 예정:** exportServiceHwpx.ts 수정 시작

---

**🎯 최종 목표:** `일상` 수준의 간단한 HWPX도 `format`처럼 한컴오피스에서 정상 작동하도록 만들기!
