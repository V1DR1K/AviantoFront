import type { Metadata } from "next";
import { LandingPage } from "../components/landing-page";

export const metadata: Metadata = {
  title: "motorcom | Gestión de taller",
  description: "Gestión de órdenes de trabajo, presupuestos e historial para talleres de motos.",
};

export default function Home() {
  return <LandingPage />;
}
