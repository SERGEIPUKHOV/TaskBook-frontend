import { LoginScreen } from "@/components/auth/login-screen";

type LoginPageProps = {
  searchParams?: {
    deleted?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return <LoginScreen deleted={searchParams?.deleted === "1"} />;
}
