function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`${name} is not set - see admin/.env.example`);
  return value;
}

export const config = {
  apiUrl: required('VITE_API_URL', import.meta.env.VITE_API_URL).replace(/\/$/, ''),
  userPoolId: required('VITE_COGNITO_USER_POOL_ID', import.meta.env.VITE_COGNITO_USER_POOL_ID),
  userPoolClientId: required('VITE_COGNITO_CLIENT_ID', import.meta.env.VITE_COGNITO_CLIENT_ID),
};
