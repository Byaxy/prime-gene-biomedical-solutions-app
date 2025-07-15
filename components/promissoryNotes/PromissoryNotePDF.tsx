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
import PDFTittle from "../pdf-template/PDFTittle";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Signature from "../pdf-template/Signature";

// styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 20,
    fontSize: 10,
    color: "#072a69",
    fontFamily: "Times-Roman",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    fontSize: 8,
    paddingVertical: 2,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#002060",
    fontWeight: "bold",
    color: "#00fdff",
    fontSize: 9,
    paddingVertical: 4,
  },
  evenRow: {
    backgroundColor: "#E8E9E9",
  },
  col1: { width: "5%", paddingHorizontal: 5 },
  col2: { width: "8%" },
  col3: { width: "50%" },
  col4: { width: "15%", paddingHorizontal: 10 },
  col5: { width: "12%" },
  col6: { width: "10%" },
  col7: { width: "90%" },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  info: {
    fontSize: 9,
    marginBottom: 2,
  },
  infoContainer: {
    display: "flex",
    flexDirection: "row",
    flex: 1,
    gap: 20,
  },
  tableContainer: {
    flexGrow: 1,
  },
  pageBreakAvoidContainer: {
    marginTop: "auto",
  },
  summary: {
    marginTop: 10,
    alignSelf: "flex-end",
    width: "25%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
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
        {/* Header */}
        <PDFHeader />
        {/* Title */}
        <PDFTittle title="Promisssory Note" />

        {/* Info */}
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            marginVertical: 20,
            gap: 40,
          }}
        >
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 10,
            }}
          >
            <Image
              src="/assets/images/qrcode.png"
              style={{ width: 50, height: 50 }}
            />
          </View>

          <View
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 10,
            }}
          >
            <View style={styles.infoContainer}>
              <Text style={{ ...styles.info, flex: 1 }}>{"Delivery Date"}</Text>
              <Text style={{ ...styles.info, fontWeight: "bold", flex: 4 }}>
                {formatDateTime(note.promissoryNoteDate).dateTime}
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={{ ...styles.info, flex: 1 }}>
                {"Delivery Ref No."}
              </Text>
              <Text style={{ ...styles.info, fontWeight: "bold", flex: 4 }}>
                {note.promissoryNoteRefNumber}
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={{ ...styles.info, flex: 1 }}>
                {"Delivery Status"}
              </Text>
              <Text style={{ ...styles.info, fontWeight: "bold", flex: 4 }}>
                {note.status}
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={{ ...styles.info, flex: 1 }}>{"Sale Date"}</Text>
              <Text style={{ ...styles.info, fontWeight: "bold", flex: 4 }}>
                {formatDateTime(sale.saleDate).dateTime}
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={{ ...styles.info, flex: 1 }}>
                {"Invoice Ref No."}
              </Text>
              <Text style={{ ...styles.info, fontWeight: "bold", flex: 4 }}>
                {sale.invoiceNumber}
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={{ ...styles.info, flex: 1 }}>
                {"Purchase Order No."}
              </Text>
              <Text style={{ ...styles.info, fontWeight: "bold", flex: 4 }}>
                {"N/A"}
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={{ ...styles.info, flex: 1 }}>
                {"Purchase Order Date"}
              </Text>
              <Text style={{ ...styles.info, fontWeight: "bold", flex: 4 }}>
                {"N/A"}
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
            gap: 40,
          }}
        >
          <Address
            addressTitle="Billing Address:"
            name={customer.name}
            address={customer.address.address}
            phone={customer.phone}
            email={customer.email}
            city={customer.address.city}
            country={customer.address.country}
          />

          <Address
            addressTitle="Delivery Address:"
            name={customer.name}
            address={customer.address.address}
            phone={customer.phone}
            email={customer.email}
            city={customer.address.city}
            country={customer.address.country}
          />
        </View>

        {/* Products Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            <Text style={styles.col1}>#</Text>
            <Text style={styles.col2}>PID</Text>
            <Text style={styles.col3}>Product Description</Text>
            <Text style={styles.col4}>Quantity</Text>
            <Text style={styles.col5}>Unit Price</Text>
            <Text style={styles.col6}>Sub Total</Text>
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
              <Text style={styles.col5}>{product.unitPrice}</Text>
              <Text style={styles.col6}>
                {formatCurrency(String(product.subTotal), currency)}
              </Text>
            </View>
          ))}
          {/* Summary */}
          <View style={styles.summary} wrap={false}>
            <View style={{ ...styles.summaryRow, fontWeight: "bold" }}>
              <Text>Grand Total:</Text>
              <Text style={{ width: "40%" }}>
                {formatCurrency(String(note.totalAmount), currency)}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            display: "flex",
            flexDirection: "column",
            paddingHorizontal: 40,
            paddingTop: 2,
            marginBottom: 20,
          }}
        >
          <Text style={styles.info}>
            In consideration of the valued to be received, NORTHLAND BIOMEDICAL
            SOLUTION do hereby promise to supplied the above items. In event
            this Note is in default and the collection proceedings are
            instituted, NORTHLAN BIOMEDICAL SOLUTIONS agrees to pay back the
            amount equivalent that will be due.
          </Text>
        </View>

        <View style={styles.pageBreakAvoidContainer}>
          <View
            wrap={false}
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <View style={{ width: "50%" }}>
              <Signature
                signatureUrl={"/assets/images/signature.png"}
                title="Sales Manager"
              />
            </View>
            <View style={{ width: "50%" }}>
              <Signature title="Customer" />
            </View>
          </View>
        </View>
        <View
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <View
            style={{
              backgroundColor: "#E8E9E9",
              paddingVertical: 2,
              paddingHorizontal: 5,
              width: "20%",
            }}
          >
            <Text style={{ fontWeight: "bold", fontSize: 9 }}>
              Terms & Conditions
            </Text>
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              paddingHorizontal: 5,
              paddingTop: 2,
            }}
          >
            <Text style={styles.info}>
              By signing above, you agree the terms on this Promissory note are
              correct and accurate, no other terms & conditions shall apply.
            </Text>
          </View>
        </View>

        <PDFFooter />
      </Page>
    </Document>
  );
};

export default PromissoryNotePDF;
