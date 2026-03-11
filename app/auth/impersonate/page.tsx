import { ImpersonateScreen } from "@/components/auth/impersonate-screen";

type ImpersonatePageProps = {
  searchParams?: {
    code?: string;
  };
};

export default function ImpersonatePage({ searchParams }: ImpersonatePageProps) {
  return <ImpersonateScreen code={searchParams?.code} />;
}
