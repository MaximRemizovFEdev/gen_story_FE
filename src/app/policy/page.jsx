import LegalDocumentPage from "../../screens/LegalDocumentPage";
import { readLegalDocument } from "../legal-document";

export default function Page() {
  return <LegalDocumentPage source={readLegalDocument("policy")} />;
}
