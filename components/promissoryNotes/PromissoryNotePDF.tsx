/* eslint-disable jsx-a11y/alt-text */
import { PromissoryNoteWithRelations } from "@/types";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import PDFFooter from "../pdf-template/PDFFooter";
import Address from "../pdf-template/Address";
import PDFHeader from "../pdf-template/PDFHeader";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Signature from "../pdf-template/Signature";
import PromissoryTermsAndConditions from "../pdf-template/PromissoryTermsAndConditions";
import ThankYouNote from "../pdf-template/ThankYouNote";

// styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 15,
    fontSize: 10,
    color: "#000",
    fontFamily: "Times-Roman",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: "25%",
    left: "15%",
    width: 440,
    height: 420,
    opacity: 0.1,
    zIndex: -1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    fontSize: 10,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#819AC2",
    fontWeight: "bold",
    color: "#000",
    fontSize: 10,
  },
  evenRow: {
    backgroundColor: "#D5DCE4",
  },
  col1: {
    width: "5%",
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  col2: {
    width: "12%",
    paddingVertical: 5,
    paddingRight: 5,
  },
  col3: {
    width: "55%",
    paddingVertical: 5,
  },
  col4: {
    width: "8%",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  col5: {
    width: "10%",
    paddingVertical: 5,
  },
  col6: {
    width: "10%",
    paddingVertical: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  summary: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: "30%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingHorizontal: 5,
    fontWeight: "bold",
  },
  summaryRowWithBorder: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    paddingHorizontal: 5,
    paddingVertical: 4,
    fontWeight: "bold",
    backgroundColor: "#819AC2",
  },

  tableContainer: {
    flexGrow: 1,
    color: "#000",
  },
  pageBreakAvoidContainer: {
    marginTop: "auto",
  },
  signatureSection: {
    display: "flex",
    flexDirection: "row",
    gap: 40,
  },
  bankSection: {
    display: "flex",
    flexDirection: "row",
    gap: 40,
  },
});

const PromissoryNotePDF = ({
  promissoryNote,
  currency,
}: {
  promissoryNote: PromissoryNoteWithRelations;
  currency: string;
}) => {
  const { promissoryNote: note, products, sale, customer } = promissoryNote;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Background Image */}
        <Image
          style={styles.backgroundImage}
          src="/assets/logos/logo3.jpeg"
          fixed
        />
        {/* Header */}
        <PDFHeader />
        {/* Title */}

        {/* Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginBottom: 20,
            gap: 40,
          }}
        >
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              flex: 2,
            }}
          >
            <Text style={styles.title}>PROMISSORY NOTE</Text>
          </View>

          <View
            style={{
              display: "flex",
              flexDirection: "row",
              flex: 1,
              color: "#000",
            }}
          >
            <View
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  textAlign: "center",
                  backgroundColor: "#819AC2",
                  paddingTop: 2,
                  paddingBottom: 2,
                  fontSize: 10,
                }}
              >
                Date
              </Text>
              <Text
                style={{
                  ...styles.companyInfo,
                  textAlign: "center",
                  paddingVertical: 2,
                  fontWeight: "bold",
                }}
              >
                {formatDateTime(note.promissoryNoteDate).dateOnly}
              </Text>
            </View>
            <View
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  textAlign: "center",
                  backgroundColor: "#819AC2",
                  paddingTop: 2,
                  paddingBottom: 2,
                  fontSize: 10,
                }}
              >
                Invoice #
              </Text>
              <Text
                style={{
                  ...styles.companyInfo,
                  textAlign: "center",
                  paddingVertical: 2,
                  fontWeight: "bold",
                }}
              >
                {sale.invoiceNumber || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        {/* Address Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginBottom: 20,
            gap: 80,
          }}
        >
          <Address
            addressTitle="Billing Address"
            name={customer.name}
            address={customer.address.address}
            phone={customer.phone}
            email={customer.email}
            city={customer.address.city}
            country={customer.address.country}
          />

          <Address
            addressTitle="Delivery Address"
            name={customer.name}
            address={customer.address.address || ""}
            phone={customer.phone || ""}
            email={customer.email || ""}
            city={customer.address.city || ""}
            country={customer.address.country}
          />
        </View>

        {/* Products Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            <Text style={styles.col1}>S/N</Text>
            <Text style={styles.col2}>PID</Text>
            <Text style={styles.col3}>Product Description</Text>
            <Text style={styles.col4}>Qnty</Text>
            <Text style={styles.col5}>Unit Price</Text>
            <Text style={styles.col6}>Sub-Total</Text>
          </View>

          {/* Table Rows */}
          {products.map((product, index) => (
            <View
              key={product.id}
              style={[styles.row, index % 2 === 1 ? styles.evenRow : {}]}
            >
              <Text style={styles.col1}>
                {index < 9 ? `0${index + 1}` : index + 1}
              </Text>
              <Text style={styles.col2}>{product.productID}</Text>
              <Text style={styles.col3}>{product.productName}</Text>
              <Text style={styles.col4}>{product.quantity}</Text>
              <Text style={styles.col5}>{product.unitPrice.toFixed(2)}</Text>
              <Text style={styles.col6}>{product.subTotal.toFixed(2)}</Text>
            </View>
          ))}
          {/* Summary */}
          <View style={styles.summary} wrap={false}>
            <View style={styles.summaryRowWithBorder}>
              <Text>Grand Total ({currency}):</Text>
              <Text style={{ width: "32%" }}>
                {formatCurrency(String(note.totalAmount.toFixed(2)), currency)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.pageBreakAvoidContainer}>
          <View
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginVertical: 20,
              paddingHorizontal: 60,
            }}
          >
            <Text
              style={{
                textAlign: "justify",
                fontSize: 10,
                color: "#000",
                lineHeight: 1.2,
              }}
            >
              In consideration of the valued to be received, NORTHLAND
              BIOMEDICAL SOLUTION do hereby promise to supplied the above items.
              In the event this note is in default and the collection
              proceedings are instituted, NBS agrees to pay back the amount
              equivalent that will be due.
            </Text>
          </View>
          <View wrap={false}>
            {/* Signature */}
            <View style={styles.signatureSection}>
              <Signature title="Sales Manager" />
              <View style={{ marginRight: 20 }}>
                <Signature title="Customer" />
              </View>
            </View>

            {/* Bank Details - Terms & Conditions */}
            <View style={styles.bankSection}>
              <PromissoryTermsAndConditions />
            </View>
          </View>
        </View>

        <ThankYouNote />

        <PDFFooter />
      </Page>
    </Document>
  );
};

export default PromissoryNotePDF;
