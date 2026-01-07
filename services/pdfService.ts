import { jsPDF } from "jspdf";
import { ExtractedContent, ContentBlock } from "../types";

/**
 * Load an image and return its data URL
 */
async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve({ dataUrl, width: img.width, height: img.height });
      } catch (e) {
        console.error("Failed to convert image:", e);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.error("Failed to load image:", url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Add an image to the PDF - FULL WIDTH like web preview
 */
async function addImageToPdf(
  doc: jsPDF,
  imageUrl: string,
  margin: number,
  maxWidth: number,
  y: number,
  pageHeight: number,
  pageMargin: number
): Promise<number> {
  const imageData = await loadImageAsDataUrl(imageUrl);

  if (!imageData) return y;

  // Calculate aspect ratio
  const aspectRatio = imageData.height / imageData.width;

  // Make image full width (like the web preview)
  const imgWidth = maxWidth;
  let imgHeight = imgWidth * aspectRatio;

  // If image is too tall for one page, cap it but keep aspect ratio
  const maxPageHeight = pageHeight - pageMargin * 2 - 20;
  if (imgHeight > maxPageHeight) {
    imgHeight = maxPageHeight;
  }

  // Check page break - if image won't fit, start new page
  if (y + imgHeight > pageHeight - pageMargin) {
    doc.addPage();
    y = pageMargin;
  }

  try {
    doc.addImage(imageData.dataUrl, "JPEG", margin, y, imgWidth, imgHeight);
    return y + imgHeight + 10;
  } catch (e) {
    console.error("Failed to add image:", e);
    return y;
  }
}

export const generatePdf = async (data: ExtractedContent) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // Smaller margin for more content space
  const maxLineWidth = pageWidth - margin * 2;

  let y = margin;

  // Helper for page breaks
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("X Article Archive", margin, y);
  doc.text(new Date().toLocaleDateString(), pageWidth - margin, y, { align: "right" });
  y += 10;

  // Cover image - FULL WIDTH
  if (data.coverImage) {
    y = await addImageToPdf(doc, data.coverImage, margin, maxLineWidth, y, pageHeight, margin);
  }

  // Title
  checkPageBreak(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0);
  const titleLines = doc.splitTextToSize(data.title, maxLineWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 6;

  // Author
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  const authorText = data.authorHandle ? `${data.author} ${data.authorHandle}` : data.author;
  doc.text(authorText, margin, y);
  y += 10;

  // Separator
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Content blocks
  if (data.blocks && data.blocks.length > 0) {
    for (const block of data.blocks) {
      if (block.type === "heading") {
        checkPageBreak(12);
        y += 4; // Extra space before heading
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(0);
        const headingLines = doc.splitTextToSize(block.content || "", maxLineWidth);
        doc.text(headingLines, margin, y);
        y += headingLines.length * 5.5 + 6;
      } else if (block.type === "text") {
        checkPageBreak(8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(40);

        let text = block.content || "";
        // Clean up URLs
        if (block.links) {
          block.links.forEach(link => {
            if (link.url.startsWith("http")) {
              text = text.replace(link.url, `[${link.text}]`);
            }
          });
        }

        const textLines = doc.splitTextToSize(text, maxLineWidth);
        textLines.forEach((line: string) => {
          checkPageBreak(5);
          doc.text(line, margin, y);
          y += 4.5;
        });
        y += 4;
      } else if (block.type === "image" && block.url) {
        // Full width image
        y = await addImageToPdf(doc, block.url, margin, maxLineWidth, y, pageHeight, margin);
      }
    }
  } else {
    // Fallback: plain content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40);

    const cleanContent = data.content
      .replace(/\*\*/g, "")
      .replace(/##/g, "")
      .replace(/https?:\/\/\S+/g, "[link]");

    const contentLines = doc.splitTextToSize(cleanContent, maxLineWidth);

    contentLines.forEach((line: string) => {
      checkPageBreak(5);
      doc.text(line, margin, y);
      y += 4.5;
    });
  }

  // Footer
  y += 15;
  checkPageBreak(15);
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(8);
  doc.setTextColor(150);
  if (data.tweetUrl) {
    doc.text(`Source: ${data.tweetUrl}`, margin, y);
    y += 6;
  }
  doc.text("Generated with Article Reader", margin, y);

  // Save
  const fileName = data.title
    .slice(0, 40)
    .trim()
    .replace(/[^a-z0-9]/gi, "_")
    .replace(/_+/g, "_");
  doc.save(`${fileName}.pdf`);
};
