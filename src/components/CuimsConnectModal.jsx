import { useState } from 'react';

import {
  startCuimsSession,
  submitCuimsUid,
  refreshCuimsCaptcha,
  submitCuimsLogin
} from '../utils/cuimsApi';

export default function CuimsConnectModal({
  isOpen,
  onClose,
  onConnected
}) {
  const [step, setStep] = useState('start');

  const [uid, setUid] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleOpenCuims = async () => {
    try {
      setLoading(true);
      setMessage('');

      const result = await startCuimsSession();

      if (result.success) {
        setStep('uid');
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage(
        'Unable to connect to the CUIMS backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUid = async () => {
    try {
      setLoading(true);
      setMessage('');

      const result = await submitCuimsUid(uid);

      if (result.success) {
        setCaptchaImage(result.captchaImage);
        setStep('login');
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage('Unable to submit UID.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshCaptcha = async () => {
    try {
      setLoading(true);
      setMessage('');
      setCaptcha('');

      const result = await refreshCuimsCaptcha();

      if (result.success) {
        setCaptchaImage(result.captchaImage);
      } else {
        setMessage(result.message);
      }
    } catch {
      setMessage('Unable to refresh CAPTCHA.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setMessage('');

      const result = await submitCuimsLogin(
        password,
        captcha
      );

      if (result.success) {
        setStep('connected');

        if (onConnected) {
          onConnected(result);
        }
      } else {
        setMessage(result.message);

        const refreshResult =
          await refreshCuimsCaptcha();

        if (refreshResult.success) {
          setCaptchaImage(
            refreshResult.captchaImage
          );
          setCaptcha('');
        }
      }
    } catch {
      setMessage(
        'Unable to complete CUIMS login.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        <button
          onClick={onClose}
          disabled={loading}
          style={styles.closeButton}
        >
          ×
        </button>

        <div style={styles.icon}>
          🎓
        </div>

        <h2 style={styles.title}>
          Connect CUIMS
        </h2>

        {step === 'start' && (
          <>
            <p style={styles.description}>
              Connect your CUIMS account to import
              subject-wise attendance automatically.
            </p>

            <button
              onClick={handleOpenCuims}
              disabled={loading}
              style={styles.primaryButton}
            >
              {loading
                ? 'Connecting...'
                : 'Connect CUIMS'}
            </button>
          </>
        )}

        {step === 'uid' && (
          <>
            <p style={styles.description}>
              Enter your CUIMS User ID.
            </p>

            <input
              type="text"
              placeholder="Enter CUIMS User ID"
              value={uid}
              onChange={(event) =>
                setUid(event.target.value)
              }
              style={styles.input}
              autoFocus
            />

            <button
              onClick={handleSubmitUid}
              disabled={
                loading ||
                !uid.trim()
              }
              style={styles.primaryButton}
            >
              {loading
                ? 'Loading...'
                : 'Next'}
            </button>
          </>
        )}

        {step === 'login' && (
          <>
            <p style={styles.description}>
              Enter your password and the CAPTCHA
              shown below.
            </p>

            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              style={styles.input}
            />

            {captchaImage && (
              <div style={styles.captchaSection}>

                <div style={styles.captchaImageBox}>
                  <img
                    src={captchaImage}
                    alt="CUIMS CAPTCHA"
                    style={styles.captchaImage}
                  />
                </div>

                <button
                  onClick={handleRefreshCaptcha}
                  disabled={loading}
                  style={styles.refreshButton}
                >
                  ↻ Refresh CAPTCHA
                </button>

              </div>
            )}

            <input
              type="text"
              placeholder="Enter CAPTCHA"
              value={captcha}
              onChange={(event) =>
                setCaptcha(event.target.value)
              }
              style={styles.input}
            />

            <button
              onClick={handleLogin}
              disabled={
                loading ||
                !password.trim() ||
                !captcha.trim()
              }
              style={styles.primaryButton}
            >
              {loading
                ? 'Logging in...'
                : 'Login'}
            </button>
          </>
        )}

        {step === 'connected' && (
          <div style={styles.connectedSection}>

            <div style={styles.successIcon}>
              ✓
            </div>

            <h3 style={styles.successTitle}>
              CUIMS Connected
            </h3>

            <p style={styles.successText}>
              Login was successful.
            </p>

            <p style={styles.nextText}>
              Attendance data will now be imported
              into the Prediction section.
            </p>

          </div>
        )}

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5000,
    padding: '20px'
  },

  modal: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#1c1c1f',
    border: '1px solid #35353a',
    borderRadius: '20px',
    padding: '28px',
    position: 'relative',
    textAlign: 'center',
    boxSizing: 'border-box',
    color: '#ffffff'
  },

  closeButton: {
    position: 'absolute',
    right: '14px',
    top: '10px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#999',
    fontSize: '28px',
    cursor: 'pointer'
  },

  icon: {
    width: '62px',
    height: '62px',
    margin: '0 auto 14px',
    borderRadius: '18px',
    backgroundColor: '#203c28',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '30px'
  },

  title: {
    margin: '0 0 12px',
    fontSize: '24px'
  },

  description: {
    color: '#a7a7a7',
    lineHeight: 1.6,
    margin: '0 0 22px'
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid #454545',
    backgroundColor: '#121212',
    color: '#ffffff',
    outline: 'none',
    marginBottom: '12px',
    fontSize: '15px'
  },

  primaryButton: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '12px',
    backgroundColor: '#44b96b',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },

  captchaSection: {
    marginBottom: '14px'
  },

  captchaImageBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '65px',
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    marginBottom: '8px'
  },

  captchaImage: {
    width: '110px',
    height: '48px',
    objectFit: 'contain'
  },

  refreshButton: {
    border: 'none',
    backgroundColor: 'transparent',
    color: '#7ee69b',
    cursor: 'pointer',
    fontSize: '13px'
  },

  connectedSection: {
    paddingTop: '5px'
  },

  successIcon: {
    width: '52px',
    height: '52px',
    margin: '0 auto 14px',
    borderRadius: '50%',
    backgroundColor: '#245c35',
    color: '#7ee69b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    fontWeight: 'bold'
  },

  successTitle: {
    margin: '0 0 10px'
  },

  successText: {
    color: '#aaa',
    lineHeight: 1.5
  },

  nextText: {
    color: '#777',
    fontSize: '13px',
    lineHeight: 1.5,
    marginTop: '16px'
  },

  message: {
    marginTop: '18px',
    padding: '10px',
    borderRadius: '10px',
    backgroundColor: '#242424',
    color: '#ffb74d',
    fontSize: '13px',
    lineHeight: 1.5
  }
};