import type { Metadata } from "next";
import { LandingPage } from "../components/landing-page";

export const metadata: Metadata = {
  title: "Avianto | Mecánica integral de motos",
  description: "Gestión integral del taller, fichas e historial de motos.",
};

export default function Home() {
  return <LandingPage />;
}
