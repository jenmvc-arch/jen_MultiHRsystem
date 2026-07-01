import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// API Endpoint to generate PDF from the payslip client view
app.get('/api/generate-pdf', async (req, res) => {
  const { employeeId } = req.query;

  if (!employeeId) {
    res.status(400).send('Missing employeeId query parameter');
    return;
  }

  console.log(`[PDF Generator] Starting PDF generation for employee ID: ${employeeId}`);

  let browser;
  try {
    // Launch headless Chromium
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Construct the print-view URL
    // We point to localhost:3000 because Vite runs on port 3000 in dev
    const targetUrl = `http://localhost:3000/?print=true&employeeId=${employeeId}`;
    console.log(`[PDF Generator] Navigating to: ${targetUrl}`);

    // Navigate to the target URL
    await page.goto(targetUrl, {
      waitUntil: 'networkidle0', // Wait until network connections are idle
      timeout: 30000 // 30 second timeout
    });

    // Wait for the payslip content to render in the React app
    await page.waitForSelector('#payslip-pdf-content', { timeout: 10000 });

    // Generate standard A4 size PDF
    console.log(`[PDF Generator] Printing page as A4 PDF`);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });

    console.log(`[PDF Generator] PDF generation succeeded, streaming file to client`);

    // Stream the PDF buffer back to the client
    const buffer = Buffer.from(pdfBuffer);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip_${employeeId}.pdf"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('[PDF Generator] PDF generation failed:', error);
    res.status(500).send(`PDF generation failed: ${error.message || error}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log(`[PDF Generator] Puppeteer browser closed`);
    }
  }
});

app.listen(PORT, () => {
  console.log(`[PDF Backend] Server is running on http://localhost:${PORT}`);
});
