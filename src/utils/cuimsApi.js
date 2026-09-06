const API_URL = 'http://localhost:5000';

export const startCuimsSession = async () => {
  const response = await fetch(
    `${API_URL}/api/cuims/start`,
    {
      method: 'POST'
    }
  );

  return response.json();
};

export const submitCuimsUid = async (uid) => {
  const response = await fetch(
    `${API_URL}/api/cuims/next`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uid })
    }
  );

  return response.json();
};

export const refreshCuimsCaptcha = async () => {
  const response = await fetch(
    `${API_URL}/api/cuims/refresh-captcha`,
    {
      method: 'POST'
    }
  );

  return response.json();
};

export const submitCuimsLogin = async (
  password,
  captcha
) => {
  const response = await fetch(
    `${API_URL}/api/cuims/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        password,
        captcha
      })
    }
  );

  return response.json();
};

export const getCuimsStatus = async () => {
  const response = await fetch(
    `${API_URL}/api/cuims/status`
  );

  return response.json();
};

export const closeCuimsSession = async () => {
  const response = await fetch(
    `${API_URL}/api/cuims/close`,
    {
      method: 'POST'
    }
  );

  return response.json();
};