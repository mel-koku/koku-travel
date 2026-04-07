import { typography } from "@/lib/typography-system";

type Contact = {
  label: string;
  number: string;
  note?: string;
};

type ContactGroup = {
  title: string;
  contacts: Contact[];
};

const CONTACT_GROUPS: ContactGroup[] = [
  {
    title: "Emergency",
    contacts: [
      { label: "Police", number: "110", note: "English operators available 24/7" },
      { label: "Fire / Ambulance", number: "119" },
      { label: "Emergency from mobile", number: "112", note: "Redirects to nearest emergency center" },
    ],
  },
  {
    title: "Medical",
    contacts: [
      { label: "AMDA Medical Info", number: "03-6233-9266", note: "Multilingual medical consultation" },
      { label: "Japan Helpline", number: "0570-064-004", note: "24/7 English counseling and referrals" },
      { label: "Tokyo Medical Info", number: "03-5285-8181", note: "English hospital referrals (Tokyo)" },
    ],
  },
  {
    title: "Practical",
    contacts: [
      { label: "JR East Lost Property", number: "050-2016-1601" },
      { label: "JR West Lost Property", number: "0570-00-2486" },
      { label: "Japan Taxi", number: "03-5755-2151", note: "English dispatch (Tokyo)" },
      { label: "Tourist Info (JNTO)", number: "050-3816-2787", note: "English travel assistance" },
    ],
  },
  {
    title: "Embassies (Tokyo)",
    contacts: [
      { label: "United States", number: "03-3224-5000" },
      { label: "United Kingdom", number: "03-5211-1100" },
      { label: "Canada", number: "03-5412-6200" },
      { label: "Australia", number: "03-5232-4111" },
    ],
  },
];

export function PrintEmergency() {
  return (
    <article className="print-page">
      <div className="print-page-inner">
        <header className="mb-10">
          <p className="eyebrow-mono mb-3">Reference</p>
          <h2 className={typography({ intent: "editorial-h1" })}>
            Numbers to keep
          </h2>
        </header>

        <div className="flex-1 space-y-6">
          {CONTACT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="font-serif text-[11pt] font-semibold leading-tight text-foreground mb-2">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.contacts.map((contact) => (
                  <div key={contact.label} className="print-avoid-break flex items-baseline gap-3">
                    <span className="font-sans text-[9pt] text-foreground w-[38mm] shrink-0">
                      {contact.label}
                    </span>
                    <span className="font-mono text-[9pt] font-semibold text-foreground w-[30mm] shrink-0">
                      {contact.number}
                    </span>
                    {contact.note && (
                      <span className="font-sans text-[7.5pt] text-stone">
                        {contact.note}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-6 pt-5 border-t border-border">
          <p className="font-sans text-[8pt] text-foreground-secondary leading-[1.5]">
            Free public Wi-Fi is available at most konbini (7-Eleven, Lawson, FamilyMart), major train stations, and airports. Connect to make calls via your messaging app if you don&apos;t have a local SIM or pocket Wi-Fi.
          </p>
        </footer>
      </div>
      <div className="print-folio">Emergency</div>
    </article>
  );
}
