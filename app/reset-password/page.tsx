import { ResetPasswordScreen } from "@/components/auth/reset-password-screen";

type ResetPasswordPageProps = {
  searchParams?: {
    token?: string;
  };
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  return <ResetPasswordScreen token={searchParams?.token ?? ""} />;
}
