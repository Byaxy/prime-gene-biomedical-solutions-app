import { Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  footer: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    backgroundColor: "#819AC2",
    paddingVertical: 5,
    paddingHorizontal: 5,
    marginTop: 20,
    color: "#000",
  },
  footerColumn: { display: "flex", flexDirection: "column" },
  footerColumnHeader: {
    fontWeight: "bold",
    marginBottom: 2,
    fontSize: 9,
  },
  footerInfo: {
    fontSize: 8,
    marginBottom: 2,
  },
});

const PDFFooter = () => {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerColumn}>
        <Text style={styles.footerColumnHeader}>Products Solutions:</Text>
        <View style={{ paddingLeft: 20 }}>
          <Text style={styles.footerInfo}>
            Medical laboratory Equipment & Consumables
          </Text>
          <Text style={styles.footerInfo}>
            Medical Imaging Equipment & Consumables
          </Text>
          <Text style={styles.footerInfo}>Medical Equipment & Consumables</Text>
          <Text style={styles.footerInfo}>Dental Equipment & Consumables</Text>
          <Text style={styles.footerInfo}>
            Veterinary Equipment & Consumables
          </Text>
          <Text style={styles.footerInfo}>
            Research & Teaching Equipment & Consumables
          </Text>
        </View>
      </View>

      <View style={styles.footerColumn}>
        <Text style={styles.footerColumnHeader}>Service Solutions:</Text>
        <View style={{ paddingLeft: 20 }}>
          <Text style={styles.footerInfo}>Consultancy Services</Text>
          <Text style={styles.footerInfo}>Training Services</Text>
          <Text style={styles.footerInfo}>QC/QA Services</Text>
          <Text style={styles.footerInfo}>OEM production</Text>
          <Text style={styles.footerInfo}>Contract manufacturing</Text>
        </View>
      </View>

      <View style={styles.footerColumn}>
        <Text style={styles.footerColumnHeader}>Support Solutions:</Text>
        <View style={{ paddingLeft: 20 }}>
          <Text style={styles.footerInfo}>Equipment Placement supports</Text>
          <Text style={styles.footerInfo}>Partnership (PPP/PPP)</Text>
          <Text style={styles.footerInfo}>Installations</Text>
          <Text style={styles.footerInfo}>Maintenance Support</Text>
        </View>
      </View>
    </View>
  );
};

export default PDFFooter;
