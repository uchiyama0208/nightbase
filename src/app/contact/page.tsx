import { ContactForm } from "@/components/ContactForm";

export const metadata = {
  title: "お問い合わせ | NightBase",
  description: "NightBaseへのお問い合わせ・デモ依頼はこちら。"
};

export default function ContactPage() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <ContactForm
          title="導入相談・デモのご予約"
          description="フォーム送信後、24時間以内に担当よりご連絡いたします。"
          submitLabel="送信する"
          successMessage="送信が完了しました。担当者よりご連絡いたします。"
          errorMessage="送信に失敗しました。恐れ入りますが再度お試しください。"
          placeholders={{
            name: "お名前",
            email: "メールアドレス",
            company: "店舗名 / 企業名",
            message: "お問い合わせ内容"
          }}
        />
      </section>
    </div>
  );
}
