import { AuroraPage } from "@/components/layouts/AuroraPage";

export default function PrivacyPolicyPage() {
  return (
    <AuroraPage variant="indigo" containerClassName="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#0f172a]">NightBase プライバシーポリシー</h1>
        <p className="text-sm text-neutral-600 leading-relaxed">
          NB-Team（以下「運営者」といいます。）は、運営者が提供する「NightBase」（以下「本サービス」といいます。）における
          ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
        </p>
      </header>

      <div className="glass-panel space-y-6 p-6 md:p-8 text-sm leading-relaxed text-neutral-700">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第1条（適用範囲）</h2>
          <p>本ポリシーは、本サービスにおいて運営者が取得する個人情報およびそれに準ずる情報の取扱いに適用されます。</p>
          <p>
            本サービスからリンクされる外部サービス・外部サイトにおける情報の取扱いについては、当該サービス・サイトのプライバシーポリシーに従うものとし、
            本ポリシーは適用されません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第2条（取得する情報）</h2>
          <p>運営者は、本サービスの提供にあたり、以下の情報を取得することがあります。</p>
          <h3 className="font-semibold text-[#0f172a] text-sm mt-2">1. ユーザーに関する情報</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>氏名またはニックネーム</li>
            <li>電話番号</li>
            <li>メールアドレス</li>
            <li>ログイン情報（メールアドレス、パスワードのハッシュ等）</li>
          </ul>

          <h3 className="font-semibold text-[#0f172a] text-sm mt-2">2. 勤怠・利用状況に関する情報</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>出勤時刻、退勤時刻、休憩時間等の勤怠情報</li>
            <li>打刻時等における位置情報（GPS情報、店舗Wi-Fi情報、IPアドレス等）</li>
            <li>勤務店舗、所属、役職、在籍状況等</li>
          </ul>

          <h3 className="font-semibold text-[#0f172a] text-sm mt-2">3. 店舗に関する情報</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>店舗名、所在地（任意）、業態等</li>
            <li>売上情報、在籍キャスト数等の管理情報</li>
          </ul>

          <h3 className="font-semibold text-[#0f172a] text-sm mt-2">4. 決済・請求情報</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>有料プランに関する決済履歴</li>
            <li>
              Stripe等の決済サービスを通じて取得する決済関連情報（なお、クレジットカード番号等のセンシティブ情報は決済代行業者により処理され、
              運営者が直接保持しない場合があります。）
            </li>
          </ul>

          <h3 className="font-semibold text-[#0f172a] text-sm mt-2">5. 技術情報</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>IPアドレス</li>
            <li>ブラウザ情報、端末情報、OS情報</li>
            <li>Cookie、広告IDその他これに類する識別子</li>
            <li>アクセス日時、利用履歴、エラーログ等</li>
          </ul>

          <h3 className="font-semibold text-[#0f172a] text-sm mt-2">6. トラッキング・分析により取得する情報</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Google Analytics等により取得されるアクセス解析情報</li>
            <li>広告配信サービス（Meta広告、Google広告等）によって取得される行動履歴情報</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第3条（情報の利用目的）</h2>
          <p>運営者は、取得した情報を以下の目的で利用します。</p>
          <ul className="list-disc list-inside space-y-1">
            <li>本サービスの提供、運営、維持、保守のため</li>
            <li>ユーザー認証、ログイン管理のため</li>
            <li>勤怠管理、打刻管理、店舗管理等、本サービスの主要機能を実現するため</li>
            <li>利用料金の請求・決済のため</li>
            <li>本サービスに関する案内、問い合わせ対応、サポート対応のため</li>
            <li>不正利用の防止、セキュリティ対策のため</li>
            <li>サービス品質の改善、新機能の開発、利用状況の分析のため</li>
            <li>広告効果の測定・最適化、マーケティングのため（Google Analytics、Meta広告、Google広告等を利用する場合を含みます。）</li>
            <li>利用規約違反行為への対応、紛争対応、法令遵守のため</li>
            <li>上記の利用目的に付随する目的のため</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第4条（Google Analytics等の利用について）</h2>
          <p>
            本サービスでは、アクセス解析のためにGoogle LLCが提供するGoogle Analyticsを利用することがあります。Google Analyticsは、Cookie等を利用して
            利用者の行動情報を収集・記録・分析し、その結果が運営者に提供されます。運営者は、これらの情報を本サービスの利用状況の把握およびサービス改善等の
            目的で利用します。
          </p>
          <p>Google社によるデータの取扱いについては、Google社のプライバシーポリシー及び利用規約をご参照ください。</p>
          <p>
            ユーザーは、ブラウザの設定を変更することにより、Cookieの無効化等を行うことができますが、その場合、本サービスの一部機能が利用できなくなることが
            あります。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第5条（広告用トラッキングの利用について）</h2>
          <p>
            本サービスでは、Google広告、Meta広告等の広告配信サービスを利用し、ユーザーの行動情報を利用して広告の効果測定や最適化を行うことがあります。
            これらのサービスにおいては、Cookieや広告ID等を利用して匿名化された形で情報が収集される場合があります。
          </p>
          <p>各広告配信事業者によるデータの取扱い及びオプトアウトの方法については、各事業者のプライバシーポリシー等をご確認ください。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第6条（外部サービスの利用とデータの預託）</h2>
          <p>運営者は、本サービスの提供にあたり、以下のような外部サービスを利用し、必要な範囲でデータの保存・処理を行うことがあります。</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Supabase：データベース・認証機能等</li>
            <li>Vercel：アプリケーションのホスティング、配信等</li>
            <li>Stripe：決済処理、請求管理等</li>
          </ul>
          <p>
            これら外部サービスの提供事業者は、外国に所在する場合があり、ユーザーの情報が外国において保存・処理されることがあります。運営者は、これら事業者を
            適切に選定・監督するとともに、各事業者のプライバシーポリシー及びセキュリティ対策を確認し、ユーザーの情報の保護に努めます。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第7条（第三者提供）</h2>
          <p>運営者は、次のいずれかに該当する場合を除き、ユーザーの個人情報を第三者に提供しません。</p>
          <ul className="list-disc list-inside space-y-1">
            <li>ユーザー本人の同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難な場合</li>
            <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難な場合</li>
            <li>
              国の機関、地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより
              当該事務の遂行に支障を及ぼすおそれがある場合
            </li>
          </ul>
          <p>
            統計情報その他個人を識別できない形式に加工した情報については、この限りではなく、運営者は本サービスの改善・分析等のために第三者に提供することが
            あります。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第8条（情報の管理）</h2>
          <p>
            運営者は、ユーザーの個人情報について、漏えい、滅失またはき損の防止その他の安全管理のため、必要かつ適切な措置を講じます。また、個人情報の取扱いを
            外部に委託する場合、委託先に対して必要かつ適切な監督を行います。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第9条（情報の保存期間）</h2>
          <p>
            運営者は、利用目的の達成に必要な範囲内において、ユーザーの個人情報を保存し、目的達成後は、法令に基づく保存義務がある場合を除き、適切な方法で
            廃棄または匿名化します。具体的な保存期間は、情報の性質や利用目的等に応じて運営者が適切に定めます。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第10条（ユーザーの権利）</h2>
          <p>
            ユーザーは、運営者が保有する自己の個人情報について、開示、訂正、追加、削除、利用停止等を求めることができます。これらの請求を行う場合、ユーザーは、
            本ポリシー末尾に記載の問い合わせ窓口までご連絡ください。
          </p>
          <p>運営者は、法令に基づき合理的な範囲で速やかに対応しますが、必要に応じて本人確認を行う場合があります。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第11条（未成年者の利用）</h2>
          <p>
            本サービスは主として事業者向けの業務サービスとして提供されますが、年齢制限を設けない場合でも、店舗側の利用規程や法令に基づき、各店舗が適切に運用する
            ものとし、運営者は店舗内部の運用について一切の責任を負いません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第12条（プライバシーポリシーの変更）</h2>
          <p>
            運営者は、必要に応じて、本ポリシーの内容を変更することがあります。本ポリシーを変更する場合、運営者は、本サービス上への掲示その他適切な方法により、
            変更内容及び効力発生日をユーザーに周知します。
          </p>
          <p>変更後の本ポリシーは、効力発生日以降、本サービスに関する一切の事項に適用されます。</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-[#0f172a]">第13条（お問い合わせ窓口）</h2>
          <p>本ポリシーに関するお問い合わせ、ご意見、ご要望等は、以下の窓口までご連絡ください。</p>
          <p>NightBase運営者：NB-Team</p>
          <p>メールアドレス：nightbase@gmail.com</p>
        </section>

        <p className="text-xs text-neutral-400 pt-4">以上</p>
      </div>
    </AuroraPage>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
