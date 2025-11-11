import LoginPage from '../LoginPage';

export default function LoginPageExample() {
  return (
    <LoginPage onLogin={async (email, password) => {
      console.log('Login:', email, password);
    }} />
  );
}
