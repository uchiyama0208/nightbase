import { ContactForm } from "@/components/ContactForm";

export const metadata = {
  title: "Contact | NightBase",
  description: "Book a demo or talk with the NightBase team."
};

export default function ContactPageEn() {
  return (
    <div className="pb-24">
      <section className="container pt-20">
        <ContactForm
          title="Talk with our team"
          description="Submit the form and we will reach out within 24 hours."
          submitLabel="Send message"
          successMessage="Thanks! We'll be in touch shortly."
          errorMessage="Something went wrong. Please try again."
          placeholders={{
            name: "Name",
            email: "Email",
            company: "Venue / Company",
            message: "How can we help?"
          }}
        />
      </section>
    </div>
  );
}
