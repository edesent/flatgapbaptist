import Link from "next/link";
import Phone from "@/components/Phone";
import { church, pastor, pastorHistory } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="bg-ink text-paper">
      <div className="wrap grid gap-8 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-[1.5rem] leading-tight">Flat Gap Baptist Church</p>
          <p className="mt-3 text-[1rem] text-paper/75">
            {pastorHistory} {pastor.title} {pastor.name} serves here today.
          </p>
        </div>
        <div className="font-sans text-[0.98rem]">
          <p className="font-bold">Visit</p>
          <Link
            href="/#find"
            aria-label="Directions to Flat Gap Baptist Church"
            className="mt-2 block w-fit text-paper/80 underline decoration-paper/40 underline-offset-4 hover:text-paper"
          >
            {church.streetNumber} {church.street}
            <br />
            {church.city}, {church.stateCode} {church.zip}
          </Link>
        </div>
        <div className="font-sans text-[0.98rem]">
          <p className="font-bold">Church phone</p>
          <p className="mt-2">
            <Phone className="time text-paper/90 underline decoration-paper/40 underline-offset-4 hover:text-paper" />
          </p>
        </div>
      </div>
      <p className="wrap border-t border-paper/15 py-5 text-center font-sans text-[0.85rem] text-paper/65">
        <a
          href="https://www.elijahdesent.com/churches"
          target="_blank"
          rel="noopener"
          className="underline decoration-paper/35 underline-offset-4 hover:text-paper"
        >
          Church website development
        </a>{" "}
        by Elijah Desent
      </p>
    </footer>
  );
}
