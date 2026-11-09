import LegalDocumentPage from "../../screens/LegalDocumentPage";
import { readLegalDocument } from "../../lib/legal-document";

export default function Page() {
  return <LegalDocumentPage source={readLegalDocument("privacy")} />;
}
