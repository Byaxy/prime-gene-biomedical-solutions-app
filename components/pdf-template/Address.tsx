import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { Country } from "country-state-city";

interface AddressProps {
  addressTitle?: string;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  country?: string;
}
const styles = StyleSheet.create({
  addressInfo: {
    fontSize: 9,
    marginBottom: 2,
  },
});

const Address = ({
  addressTitle,
  name,
  address,
  phone,
  email,
  city,
  country,
}: AddressProps) => {
  return (
    <View
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        color: "#000",
      }}
    >
      <View
        style={{
          backgroundColor: "#b8c9c1e7",
          paddingTop: 4,
          paddingBottom: 4,
          paddingHorizontal: 5,
          border: "1px solid #000",
        }}
      >
        <Text
          style={{ fontWeight: "medium", fontSize: 10, textAlign: "center" }}
        >
          {addressTitle}:
        </Text>
      </View>
      <View
        style={{
          display: "flex",
          flexDirection: "column",
          paddingLeft: 10,
          paddingTop: 2,
        }}
      >
        <Text style={styles.addressInfo}>{name}</Text>
        <Text style={styles.addressInfo}>
          {city ? `${city} -` : null}{" "}
          {country ? Country.getCountryByCode(country)?.name : null}
        </Text>
        <Text style={styles.addressInfo}>{address ? address : null}</Text>
        <Text style={styles.addressInfo}>{phone ? phone : null}</Text>
        <Text style={styles.addressInfo}>{email ? email : null}</Text>
      </View>
    </View>
  );
};

export default Address;
