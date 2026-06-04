
import loginBg from '../assets/login-bg.svg';

export default function LoginBg() {
  return (
    <img src={loginBg} className="absolute inset-0 w-full h-full object-cover -z-10" alt="Login Background" />
  );
}
