// app/login/page.js
import AuthForm from '../../components/AuthForm';

export const metadata = {
  title: 'Log In - Every Rand',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <AuthForm />
    </div>
  );
}
