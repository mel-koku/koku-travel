import type { ButtonProps } from "@/components/ui/Button";
import { Button } from "@/components/ui/Button";
import { Checkbox, CheckboxGroup } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Radio, RadioGroup } from "@/components/ui/Radio";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const buttonVariants: Array<{ label: string; variant: ButtonProps["variant"] }> = [
  { label: "Primary", variant: "primary" },
  { label: "Secondary", variant: "secondary" },
  { label: "Outline", variant: "outline" },
  { label: "Ghost", variant: "ghost" },
];

const buttonSizes: NonNullable<ButtonProps["size"]>[] = ["sm", "md", "lg"];

const cities = [
  { label: "Tokyo", value: "tokyo" },
  { label: "Kyoto", value: "kyoto" },
  { label: "Osaka", value: "osaka" },
  { label: "Sapporo", value: "sapporo" },
];

const passOptions = [
  { label: "No pass", value: "none" },
  { label: "JR Pass (Nationwide)", value: "jr-pass" },
  { label: "Kansai Wide Area Pass", value: "kansai" },
];

const MailIcon = () => (
  <svg
    className="h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M4 6h16v12H4z" />
    <path d="m4 6 8 7 8-7" />
  </svg>
);

const SearchIcon = () => (
  <svg
    className="h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    className="h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m13 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SparklesIcon = () => (
  <svg
    className="h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path d="M10 2.5 8.5 8 3 9.5 8.5 11 10 16.5 11.5 11 17 9.5 11.5 8 10 2.5Zm6 9 -.75 2.25L13 14.5l2.25.75L16 17.5l.75-2.25L19 14.5l-2.25-.75L16 11.5Zm-12 0-.75 2.25L1 14.5l2.25.75L4 17.5l.75-2.25L7 14.5l-2.25-.75L4 11.5Z" />
  </svg>
);

export default function UIDemoPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-10 py-16">
      <header className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Design System
        </span>
        <h1 className="text-4xl font-bold leading-tight text-charcoal">Component Gallery</h1>
        <p className="max-w-2xl text-lg text-warm-gray">
          Buttons, form controls, and field wrappers used across Koku. This page doubles as a
          visual smoke test—update components here to validate new states quickly.
        </p>
      </header>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-charcoal">Buttons</h2>
          <p className="text-sm text-warm-gray">
            Variants cover 90% of our needs. Use icons for directional affordances, and keep loading
            states keyboard accessible.
          </p>
        </div>
        <div className="space-y-8">
          {buttonVariants.map(({ label, variant }) => (
            <div key={variant} className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-stone">
                {label}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                {buttonSizes.map((size) => (
                  <Button key={size} variant={variant} size={size}>
                    {`${label} · ${size.toUpperCase()}`}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-stone">
              States & Mix-ins
            </p>
            <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
              <Button variant="primary" isLoading leftIcon={<SparklesIcon />}>
                Loading
              </Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
              <Button variant="outline" leftIcon={<SearchIcon />}>
                Left Icon
              </Button>
              <Button variant="ghost" rightIcon={<ArrowRightIcon />}>
                Right Icon
              </Button>
              <div className="w-full max-w-xs">
                <Button variant="primary" fullWidth>
                  Full Width
                </Button>
              </div>
              <Button asChild href="/">
                Return Home
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-charcoal">Form Inputs</h2>
          <p className="text-sm text-warm-gray">
            Pair each control with a <code>FormField</code> to wire up labels, help text, and errors.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <FormField
            id="email"
            label="Email"
            required
            help="We’ll only use this to send your booking itineraries."
          >
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              leadingIcon={<MailIcon />}
            />
          </FormField>

          <FormField
            id="search"
            label="Search itineraries"
            help="Try cities, seasons, or experiences."
          >
            <Input
              id="search"
              type="search"
              placeholder="Kyoto fall foliage"
              trailingIcon={<SearchIcon />}
            />
          </FormField>

          <FormField
            id="username"
            label="Profile handle"
            error="Handle must be at least 4 characters."
          >
            <Input
              id="username"
              placeholder="koku-traveler"
              error="Handle must be at least 4 characters."
            />
          </FormField>

          <FormField
            id="notes"
            label="Trip notes"
            help="Share context for travel designers. Markdown supported soon."
          >
            <Textarea id="notes" rows={5} placeholder="Traveling with family, prefer walkable areas." />
          </FormField>

          <FormField
            id="city"
            label="Home base city"
            required
            help="Select the city you’ll stay in the longest."
          >
            <Select id="city" placeholder="Choose a city" options={cities} />
          </FormField>

          <FormField
            id="rail-pass"
            label="Rail pass preference"
            error="Pick one option to continue."
          >
            <Select
              id="rail-pass"
              placeholder="Select a pass"
              options={passOptions}
              error="Pick one option to continue."
            />
          </FormField>
        </div>
      </section>

      <section className="grid gap-10 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-charcoal">Checkboxes</h2>
          <CheckboxGroup
            legend="Interests"
            helpText="Pick all that match your travel vibe."
            className="space-y-3"
          >
            <Checkbox id="interest-food" name="interests" value="food" label="Food markets" />
            <Checkbox
              id="interest-onsen"
              name="interests"
              value="onsen"
              label="Hot springs"
              description="Relaxing ryokan stays and open-air baths."
            />
            <Checkbox
              id="interest-nightlife"
              name="interests"
              value="nightlife"
              label="Nightlife"
              description="High-energy evenings across Tokyo and Osaka."
              defaultChecked
            />
            <Checkbox
              id="interest-ski"
              name="interests"
              value="ski"
              label="Skiing & snow"
              description="Coming winter 2026"
              disabled
            />
          </CheckboxGroup>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-charcoal">Radio buttons</h2>
          <RadioGroup
            legend="Pacing"
            helpText="Choose the pace we should plan around. One selection only."
            className="space-y-3"
          >
            <Radio
              id="pace-breeze"
              name="pace"
              value="breeze"
              label="Breeze"
              description="Slow mornings, lots of gallery time."
              defaultChecked
            />
            <Radio
              id="pace-balanced"
              name="pace"
              value="balanced"
              label="Balanced"
              description="Two to three anchor activities daily."
            />
            <Radio
              id="pace-all-out"
              name="pace"
              value="all-out"
              label="All-out"
              description="Early trains, late-night ramen—maximize every hour."
            />
          </RadioGroup>
        </div>
      </section>
    </div>
  );
}

