import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();

app.use(cors());
app.use(express.json());

let browser = null;
let context = null;
let page = null;

const CUIMS_LOGIN_URL = 'https://students.cuchd.in/Login.aspx';

const ATTENDANCE_URL =
  'https://students.cuchd.in/frmStudentCourseWiseAttendanceSummary.aspx?type=etgkYfqBdH1fSfc255iYGw==';

app.get('/', (req, res) => {
  res.send('CUIMS Backend Running');
});


/* ================================
   START CUIMS SESSION
================================ */

app.post('/api/cuims/start', async (req, res) => {
  try {
    if (!browser || !browser.isConnected()) {
      browser = await chromium.launch({
        headless: true
      });
    }

    if (context) {
      try {
        await context.close();
      } catch {
        console.log('Previous CUIMS session already closed.');
      }
    }

    context = await browser.newContext();

    page = await context.newPage();

    await page.goto(CUIMS_LOGIN_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    res.json({
      success: true,
      message: 'CUIMS started in the background.'
    });

  } catch (error) {
    console.error('CUIMS Start Error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/* ================================
   ENTER UID
================================ */

app.post('/api/cuims/next', async (req, res) => {
  try {
    const { uid } = req.body;

    if (!page || page.isClosed()) {
      return res.status(400).json({
        success: false,
        message: 'CUIMS session is not active.'
      });
    }

    if (!uid || !uid.trim()) {
      return res.status(400).json({
        success: false,
        message: 'CUIMS UID is required.'
      });
    }

    await page.waitForSelector('#txtUserId', {
      state: 'visible',
      timeout: 15000
    });

    await page.fill('#txtUserId', uid.trim());

    await page.click('#btnNext');

    await page.waitForSelector('#txtLoginPassword', {
      state: 'visible',
      timeout: 15000
    });

    const captchaImage = page.locator('#imgCaptcha');

    await captchaImage.waitFor({
      state: 'visible',
      timeout: 15000
    });

    const captchaBuffer = await captchaImage.screenshot();

    const captchaBase64 = captchaBuffer.toString('base64');

    res.json({
      success: true,
      message: 'UID submitted successfully.',
      captchaImage: `data:image/png;base64,${captchaBase64}`
    });

  } catch (error) {
    console.error('CUIMS Next Error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/* ================================
   REFRESH CAPTCHA
================================ */

app.post('/api/cuims/refresh-captcha', async (req, res) => {
  try {
    if (!page || page.isClosed()) {
      return res.status(400).json({
        success: false,
        message: 'CUIMS session is not active.'
      });
    }

    await page.click('#lnkupCaptcha');

    await page.waitForTimeout(1000);

    const captchaImage = page.locator('#imgCaptcha');

    await captchaImage.waitFor({
      state: 'visible',
      timeout: 10000
    });

    const captchaBuffer = await captchaImage.screenshot();

    const captchaBase64 = captchaBuffer.toString('base64');

    res.json({
      success: true,
      captchaImage: `data:image/png;base64,${captchaBase64}`
    });

  } catch (error) {
    console.error('Refresh CAPTCHA Error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/* ================================
   LOGIN
================================ */

app.post('/api/cuims/login', async (req, res) => {
  try {
    const { password, captcha } = req.body;

    if (!page || page.isClosed()) {
      return res.status(400).json({
        success: false,
        message: 'CUIMS session is not active.'
      });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Password is required.'
      });
    }

    if (!captcha || !captcha.trim()) {
      return res.status(400).json({
        success: false,
        message: 'CAPTCHA is required.'
      });
    }

    await page.fill('#txtLoginPassword', password);

    await page.fill('#txtcaptcha', captcha.trim());

    await page.click('#btnLogin');

    await page.waitForTimeout(3000);

    const loginPageStillVisible =
      await page.locator('#txtLoginPassword').count() > 0;

    if (loginPageStillVisible) {
      return res.json({
        success: false,
        message:
          'Login may have failed. Please check your password or CAPTCHA.'
      });
    }

    res.json({
      success: true,
      message: 'CUIMS login successful.',
      url: page.url()
    });

  } catch (error) {
    console.error('CUIMS Login Error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/* ================================
   GO TO HOME PAGE
================================ */

app.post('/api/cuims/go-home', async (req, res) => {
  try {
    if (!page || page.isClosed()) {
      return res.status(400).json({
        success: false,
        message: 'CUIMS session is not active.'
      });
    }

    await page.waitForSelector('#bntNavigate', {
      state: 'visible',
      timeout: 15000
    });

    await page.click('#bntNavigate');

    await page.waitForTimeout(3000);

    res.json({
      success: true,
      message: 'Navigated to CUIMS home page.',
      currentUrl: page.url(),
      title: await page.title()
    });

  } catch (error) {
    console.error('CUIMS Go Home Error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/* ================================
   FETCH ATTENDANCE
================================ */

app.get('/api/cuims/attendance', async (req, res) => {
  try {
    if (!page || page.isClosed()) {
      return res.status(400).json({
        success: false,
        message: 'CUIMS session is not active. Please login first.'
      });
    }

    await page.goto(ATTENDANCE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(2500);

    await page.waitForSelector('#SortTable', {
      state: 'visible',
      timeout: 15000
    });

    const attendanceData = await page.locator('#SortTable').evaluate(
      (table) => {
        const rows = Array.from(table.querySelectorAll('tr'));

        return rows
          .slice(1)
          .map((row) => {
            const cells = Array.from(
              row.querySelectorAll('td')
            ).map((cell) => cell.innerText.trim());

            if (cells.length < 11) {
              return null;
            }

            return {
              courseCode: cells[0],
              title: cells[1],
              totalDelivered: Number(cells[2]) || 0,
              totalAttended: Number(cells[3]) || 0,
              idl: Number(cells[4]) || 0,
              adl: Number(cells[5]) || 0,
              vdl: Number(cells[6]) || 0,
              medicalLeave: Number(cells[7]) || 0,
              eligibleDelivered: Number(cells[8]) || 0,
              eligibleAttended: Number(cells[9]) || 0,
              eligiblePercentage: Number(cells[10]) || 0
            };
          })
          .filter(Boolean);
      }
    );

    res.json({
      success: true,
      message: 'Attendance fetched successfully.',
      attendance: attendanceData
    });

  } catch (error) {
    console.error('Attendance Fetch Error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/* ================================
   STATUS
================================ */

app.get('/api/cuims/status', async (req, res) => {
  res.json({
    success: true,

    browserActive:
      !!browser && browser.isConnected(),

    pageActive:
      !!page && !page.isClosed(),

    url:
      page && !page.isClosed()
        ? page.url()
        : null
  });
});


/* ================================
   CLOSE SESSION
================================ */

app.post('/api/cuims/close', async (req, res) => {
  try {
    if (context) {
      await context.close();
    }

    context = null;
    page = null;

    res.json({
      success: true,
      message: 'CUIMS session closed.'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/* ================================
   START SERVER
================================ */
app.get('/api/cuims/timetable', async (req, res) => {
  try {
    if (!page || page.isClosed()) {
      return res.status(400).json({
        success: false,
        message: 'CUIMS session is not active. Please login first.'
      });
    }

    const timetableUrl =
      'https://students.cuchd.in/frmMyTimeTable.aspx';

    await page.goto(timetableUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    const tables = await page.locator('table').evaluateAll((tableElements) =>
      tableElements.map((table, index) => ({
        index,
        id: table.id,
        className: table.className,
        text: table.innerText.trim()
      }))
    );

    res.json({
      success: true,
      message: 'Timetable fetched successfully.',
      currentUrl: page.url(),
      tables
    });

  } catch (error) {
    console.error('Timetable Fetch Error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.listen(5000, () => {
  console.log('=================================');
  console.log('CUIMS Backend Running');
  console.log('http://localhost:5000');
  console.log('=================================');
});