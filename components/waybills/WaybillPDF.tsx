import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import SignatureAndBankSection from "../pdf-template/SignatureAndBankSection";
import PDFFooter from "../pdf-template/PDFFooter";
import PDFHeader from "../pdf-template/PDFHeader";
import PDFTittle from "../pdf-template/PDFTittle";
import { formatDateTime } from "@/lib/utils";
import { WaybillWithRelations } from "@/types";

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
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  waybillInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
  waybillInfoContainer: {
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
});

const WaybillPDF = ({ waybill }: { waybill: WaybillWithRelations }) => {
  const { waybill: bill, sale, products } = waybill;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <PDFHeader />
        {/* Title */}
        <PDFTittle title="Waybill" />

        {/* waybill Info */}
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
              flexDirection: "column",
              flex: 1,
              gap: 10,
            }}
          >
            <View style={styles.waybillInfoContainer}>
              <Text style={{ ...styles.waybillInfo, flex: 1 }}>
                {"Waybill No."}
              </Text>
              <Text
                style={{ ...styles.waybillInfo, fontWeight: "bold", flex: 4 }}
              >
                {bill.waybillRefNumber}
              </Text>
            </View>
            <View style={styles.waybillInfoContainer}>
              <Text style={{ ...styles.waybillInfo, flex: 1 }}>
                {"Waybill Date"}
              </Text>
              <Text
                style={{ ...styles.waybillInfo, fontWeight: "bold", flex: 4 }}
              >
                {formatDateTime(bill.waybillDate).dateTime}
              </Text>
            </View>

            <View style={styles.waybillInfoContainer}>
              <Text style={{ ...styles.waybillInfo, flex: 1 }}>
                {"Invoice Date"}
              </Text>
              <Text
                style={{ ...styles.waybillInfo, fontWeight: "bold", flex: 4 }}
              >
                {sale !== null ? formatDateTime(sale.saleDate).dateTime : "N/A"}
              </Text>
            </View>
            <View style={styles.waybillInfoContainer}>
              <Text style={{ ...styles.waybillInfo, flex: 1 }}>
                {"Sale Date"}
              </Text>
              <Text
                style={{ ...styles.waybillInfo, fontWeight: "bold", flex: 4 }}
              >
                {sale !== null ? formatDateTime(sale.saleDate).dateTime : "N/A"}
              </Text>
            </View>
            <View style={styles.waybillInfoContainer}>
              <Text style={{ ...styles.waybillInfo, flex: 1 }}>
                {"Invoice Ref No."}
              </Text>
              <Text
                style={{ ...styles.waybillInfo, fontWeight: "bold", flex: 4 }}
              >
                {sale !== null ? sale.invoiceNumber : "N/A"}
              </Text>
            </View>
            <View style={styles.waybillInfoContainer}>
              <Text style={{ ...styles.waybillInfo, flex: 1 }}>
                {"Purchase Order No."}
              </Text>
              <Text
                style={{ ...styles.waybillInfo, fontWeight: "bold", flex: 4 }}
              >
                {"N/A"}
              </Text>
            </View>
            <View style={styles.waybillInfoContainer}>
              <Text style={{ ...styles.waybillInfo, flex: 1 }}>
                {"Purchase Order Date"}
              </Text>
              <Text
                style={{ ...styles.waybillInfo, fontWeight: "bold", flex: 4 }}
              >
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
        ></View>

        {/* Products Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            <Text style={styles.col1}>#</Text>
            <Text style={styles.col2}>PID</Text>
            <Text style={styles.col3}>Product Description</Text>
            <Text style={styles.col4}>Qnty Requested</Text>
            <Text style={styles.col5}>Qnty Supplied</Text>
            <Text style={styles.col6}>Balance Left</Text>
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
              <Text style={styles.col4}>{product.quantityRequested}</Text>
              <Text style={styles.col5}>{product.quantitySupplied}</Text>
              <Text style={styles.col6}>{product.balanceLeft}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pageBreakAvoidContainer}>
          <SignatureAndBankSection />
        </View>

        <PDFFooter />
      </Page>
    </Document>
  );
};

export default WaybillPDF;
