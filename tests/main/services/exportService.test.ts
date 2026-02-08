/**
 * Export Service Tests
 * DOCX와 HWPX 내보내기 기능 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { ExportService, type ExportOptions } from "../../../src/main/services/features/exportService";

describe("ExportService", () => {
  let exportService: ExportService;
  const testOutputDir = path.join(__dirname, "../../test-output");
  
  beforeEach(async () => {
    exportService = new ExportService();
    // Create test output directory
    await fs.mkdir(testOutputDir, { recursive: true });
  });
  
  afterEach(async () => {
    // Clean up test files
    try {
      const files = await fs.readdir(testOutputDir);    
      for (const file of files) {
        await fs.unlink(path.join(testOutputDir, file));
      }
      await fs.rmdir(testOutputDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  describe("DOCX Export", () => {
    it("should export simple text to DOCX", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test Chapter",
        content: "<p>This is a test paragraph.</p>",
        format: "DOCX",
        outputPath: path.join(testOutputDir, "test-simple.docx"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBe(options.outputPath);
      
      // Check file exists
      const stats = await fs.stat(options.outputPath!);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });
    
    it("should export with headings to DOCX", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test Chapter with Headings",
        content: `
          <h1>Chapter 1</h1>
          <p>First paragraph.</p>
          <h2>Section 1.1</h2>
          <p>Second paragraph.</p>
        `,
        format: "DOCX",
        outputPath: path.join(testOutputDir, "test-headings.docx"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBeTruthy();
    });
    
    it("should apply custom margins", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test Custom Margins",
        content: "<p>Test content.</p>",
        format: "DOCX",
        marginTop: 30,
        marginBottom: 20,
        marginLeft: 25,
        marginRight: 25,
        outputPath: path.join(testOutputDir, "test-margins.docx"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(true);
    });
    
    it("should handle A4 paper size", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test A4 Paper",
        content: "<p>Test content for A4 paper.</p>",
        format: "DOCX",
        paperSize: "A4",
        outputPath: path.join(testOutputDir, "test-a4.docx"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(true);
    });
    
    it("should handle Letter paper size", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test Letter Paper",
        content: "<p>Test content for Letter paper.</p>",
        format: "DOCX",
        paperSize: "Letter",
        outputPath: path.join(testOutputDir, "test-letter.docx"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(true);
    });
    
    it("should fail without output path", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test No Output",
        content: "<p>Test content.</p>",
        format: "DOCX",
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
    
    it("should automatically add .docx extension", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test Extension",
        content: "<p>Test content.</p>",
        format: "DOCX",
        outputPath: path.join(testOutputDir, "test-extension"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toContain(".docx");
    });
  });
  
  describe("HWPX Export", () => {
    it("should export simple text to HWPX", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test Chapter HWPX",
        content: "<p>This is a test paragraph for HWPX.</p>",
        format: "HWPX",
        outputPath: path.join(testOutputDir, "test-simple.hwpx"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toBe(options.outputPath);
      
      // Check file exists
      const stats = await fs.stat(options.outputPath!);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });
    
    it("should export with multiple paragraphs to HWPX", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test Multiple Paragraphs",
        content: `
          <p>First paragraph.</p>
          <p>Second paragraph.</p>
          <p>Third paragraph.</p>
        `,
        format: "HWPX",
        outputPath: path.join(testOutputDir, "test-multi-para.hwpx"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(true);
    });
    
    it("should handle Korean text in HWPX", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "한글 테스트",
        content: `
          <p>동해물과 백두산이 마르고 닳도록</p>
          <p>하느님이 보우하사 우리나라 만세</p>
        `,
        format: "HWPX",
        outputPath: path.join(testOutputDir, "test-korean.hwpx"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(true);
    });
    
    it("should automatically add .hwpx extension", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test Extension HWPX",
        content: "<p>Test content.</p>",
        format: "HWPX",
        outputPath: path.join(testOutputDir, "test-extension-hwpx"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(true);
      expect(result.filePath).toContain(".hwpx");
    });
  });
  
  describe("Error Handling", () => {
    it("should fail with empty content", async () => {
      const options: ExportOptions = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test Empty",
        content: "",
        format: "DOCX",
        outputPath: path.join(testOutputDir, "test-empty.docx"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(false);
    });
    
    it("should fail with invalid format", async () => {
      const options = {
        projectId: "test-project-id",
        chapterId: "test-chapter-id",
        title: "Test Invalid",
        content: "<p>Test</p>",
        format: "INVALID" as any,
        outputPath: path.join(testOutputDir, "test-invalid.txt"),
      };
      
      const result = await exportService.export(options);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
