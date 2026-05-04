type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
      <h2 className="section-title mt-2">{title}</h2>
      {description ? <p className="section-text mt-4 text-sm sm:text-base">{description}</p> : null}
    </div>
  );
}
