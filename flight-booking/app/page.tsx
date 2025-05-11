"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Loader2,
  Plane,
  ArrowRight,
  Calendar,
  Clock,
  Wallet,
  History,
  Download,
  Search,
  MapPin,
  CloudSun,
  Sun,
  Sunset,
  CreditCard,
} from "lucide-react";

const MotionCard = motion(Card);

export default function Home() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [flights, setFlights] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [wallet, setWallet] = useState(50000);
  const [bookings, setBookings] = useState<any[]>([]);
  const [filterTime, setFilterTime] = useState("all");
  const [activeInput, setActiveInput] = useState<"from" | "to" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState("search");

  // Auto-suggest airports
  const handleInputChange = async (value: string, type: "from" | "to") => {
    setActiveInput(type);
    if (type === "from") setFrom(value);
    else setTo(value);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      console.log(`Fetching suggestions for ${type}: ${value}`);
      const res = await axios.get(
        "https://letsgo-makkah.vercel.app/api/flights/suggest",
        {
          params: { query: value },
        }
      );
      console.log("Suggestions response:", res.data);
      if (res.data.success) {
        setSuggestions(res.data.data || []);
      } else {
        toast.error(res.data.message || "Failed to fetch suggestions");
        setSuggestions([]);
      }
    } catch (error: any) {
      console.error(
        "Suggestions error:",
        error.response?.data || error.message
      );
      toast.error("Failed to fetch suggestions");
      setSuggestions([]);
    }
  };

  // Search flights
  const searchFlights = async () => {
    if (!from || !to) {
      toast.error("Please enter both origin and destination");
      return;
    }
    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
      toast.error(
        "Please select valid airport codes (e.g., DEL, BOM) from suggestions"
      );
      return;
    }
    setIsLoading(true);
    try {
      console.log(`Searching flights from ${from} to ${to}`);
      const res = await axios.get(
        "https://letsgo-makkah.vercel.app/api/flights/search",
        {
          params: { from, to },
        }
      );
      console.log("Search response:", res.data);
      if (res.data.success) {
        setFlights(res.data.data || []);
        toast.success("Flights fetched successfully");
      } else {
        toast.error(res.data.message || "Failed to fetch flights");
        setFlights([]);
      }
    } catch (error: any) {
      console.error("Search error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to fetch flights");
      setFlights([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Open booking modal
  const openBookingModal = (flightId: string) => {
    const flight = flights.find((f) => f._id === flightId);
    if (!flight) {
      toast.error("Flight not found");
      return;
    }
    if (wallet < flight.price) {
      toast.error("Insufficient wallet balance");
      return;
    }
    setSelectedFlight(flight);
    setIsModalOpen(true);
  };

  // Confirm booking and download ticket
  const confirmBooking = async () => {
    if (!selectedFlight) {
      toast.error("No flight selected");
      setIsModalOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      console.log(`Booking flight: ${selectedFlight._id}`);
      const res = await axios.post(
        "https://letsgo-makkah.vercel.app/api/flights/book",
        {
          flightId: selectedFlight._id,
        }
      );
      console.log("Booking response:", res.data);
      if (res.data.success) {
        setWallet(wallet - res.data.data.price);
        setBookings([...bookings, res.data.data]);
        setFlights(
          flights.map((f) =>
            f._id === selectedFlight._id
              ? { ...f, price: res.data.data.price }
              : f
          )
        );
        toast.success("Flight booked successfully! Downloading ticket...");

        // Download ticket PDF
        const ticketRes = await fetch(
          `https://letsgo-makkah.vercel.app/api/ticket?bookingId=${res.data.data._id}`
        );
        if (!ticketRes.ok) {
          throw new Error("Failed to fetch ticket");
        }
        const blob = await ticketRes.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ticket-${res.data.data._id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        toast.error(res.data.message || "Failed to book flight");
      }
    } catch (error: any) {
      console.error("Booking error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to book flight");
    } finally {
      setIsLoading(false);
      setIsModalOpen(false);
      setSelectedFlight(null);
    }
  };

  // Fetch booking history
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        console.log("Fetching booking history");
        const res = await axios.get(
          "https://letsgo-makkah.vercel.app/api/bookings"
        );
        console.log("Bookings response:", res.data);
        if (res.data.success) {
          setBookings(res.data.data || []);
        } else {
          toast.error(res.data.message || "Failed to fetch bookings");
        }
      } catch (error: any) {
        console.error("Bookings error:", error.response?.data || error.message);
        toast.error("Failed to fetch bookings");
      }
    };
    fetchBookings();
  }, []);

  // Get time icon based on time of day
  const getTimeIcon = (time: string) => {
    switch (time) {
      case "morning":
        return <CloudSun className="w-5 h-5 text-amber-500" />;
      case "afternoon":
        return <Sun className="w-5 h-5 text-amber-500" />;
      case "evening":
        return <Sunset className="w-5 h-5 text-amber-500" />;
      default:
        return <Clock className="w-5 h-5 text-sky-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-50">
      <Toaster position="top-right" />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-sky-700 to-sky-500 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[url('/placeholder.svg?height=800&width=1600')] bg-cover bg-center" />
        </div>
        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex justify-center mb-6"
            >
              <Plane className="w-16 h-16 text-white" />
            </motion.div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
              SkyVoyage
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-sky-100">
              Elevate your journey with premium flight experiences
            </p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Button
                size="lg"
                className="bg-white text-sky-700 hover:bg-sky-50"
                onClick={() => setActiveTab("search")}
              >
                Book Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white  text-blue-500 hover:bg-white/20"
                onClick={() => setActiveTab("history")}
              >
                View Bookings
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 120"
            className="w-full h-auto"
          >
            <path
              fill="#ffffff"
              fillOpacity="1"
              d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
            ></path>
          </svg>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Wallet Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <MotionCard
            className="mb-8 shadow-lg overflow-hidden bg-gradient-to-r from-sky-600 to-sky-400 text-white"
            whileHover={{
              y: -5,
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Wallet className="w-6 h-6" />
                Wallet Balance
              </CardTitle>
              <CardDescription className="text-sky-100">
                Your available funds for booking flights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">₹{wallet.toLocaleString()}</p>
            </CardContent>
          </MotionCard>
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Tabs
            defaultValue="search"
            value={activeTab}
            onValueChange={setActiveTab}
            className="mb-8"
          >
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="search" className="text-base">
                <Search className="w-4 h-4 mr-2" />
                Search Flights
              </TabsTrigger>
              <TabsTrigger value="history" className="text-base">
                <History className="w-4 h-4 mr-2" />
                Booking History
              </TabsTrigger>
            </TabsList>

            {/* Search Tab */}
            <TabsContent value="search" className="space-y-8">
              {/* Search Bar */}
              <MotionCard
                className="shadow-lg border-sky-100"
                whileHover={{
                  boxShadow:
                    "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                }}
              >
                <CardHeader>
                  <CardTitle className="text-2xl text-sky-700">
                    Find Your Flight
                  </CardTitle>
                  <CardDescription>
                    Enter your origin and destination to search for available
                    flights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="relative">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="w-4 h-4 text-sky-500" />
                        <span className="text-sm font-medium text-sky-700">
                          Origin
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          placeholder="From (City/Airport)"
                          value={from}
                          onChange={(e) =>
                            handleInputChange(e.target.value, "from")
                          }
                          className="w-full border-sky-200 focus:ring-sky-500 pl-10"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Badge
                            variant="outline"
                            className="bg-sky-50 text-sky-700 border-sky-200"
                          >
                            From
                          </Badge>
                        </div>
                      </div>
                      {activeInput === "from" && suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute z-10 bg-white border rounded-md mt-1 w-full max-h-40 overflow-y-auto shadow-md"
                        >
                          {suggestions.map((s) => (
                            <Button
                              key={s.PlaceId}
                              variant="ghost"
                              className="w-full text-left justify-start hover:bg-sky-50"
                              onClick={() => {
                                setFrom(s.IataCode);
                                setSuggestions([]);
                                setActiveInput(null);
                              }}
                            >
                              {s.PlaceName} ({s.IataCode})
                            </Button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                    <div className="relative">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="w-4 h-4 text-sky-500" />
                        <span className="text-sm font-medium text-sky-700">
                          Destination
                        </span>
                      </div>
                      <div className="relative">
                        <Input
                          placeholder="To (City/Airport)"
                          value={to}
                          onChange={(e) =>
                            handleInputChange(e.target.value, "to")
                          }
                          className="w-full border-sky-200 focus:ring-sky-500 pl-10"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <Badge
                            variant="outline"
                            className="bg-sky-50 text-sky-700 border-sky-200"
                          >
                            To
                          </Badge>
                        </div>
                      </div>
                      {activeInput === "to" && suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute z-10 bg-white border rounded-md mt-1 w-full max-h-40 overflow-y-auto shadow-md"
                        >
                          {suggestions.map((s) => (
                            <Button
                              key={s.PlaceId}
                              variant="ghost"
                              className="w-full text-left justify-start hover:bg-sky-50"
                              onClick={() => {
                                setTo(s.IataCode);
                                setSuggestions([]);
                                setActiveInput(null);
                              }}
                            >
                              {s.PlaceName} ({s.IataCode})
                            </Button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-sky-500" />
                        <span className="text-sm font-medium text-sky-700">
                          Search
                        </span>
                      </div>
                      <Button
                        onClick={searchFlights}
                        disabled={isLoading}
                        className="w-full h-10 bg-sky-600 hover:bg-sky-700 transition-colors"
                      >
                        {isLoading ? (
                          <Loader2 className="animate-spin mr-2" />
                        ) : (
                          <>
                            <Search className="w-4 h-4 mr-2" />
                            Search Flights
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 text-sky-500" />
                    <span className="text-sm font-medium text-sky-700">
                      Filter by Time
                    </span>
                  </div>
                  <Select onValueChange={setFilterTime} value={filterTime}>
                    <SelectTrigger className="w-full md:w-1/3 border-sky-200">
                      <SelectValue placeholder="Filter by Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Times</SelectItem>
                      <SelectItem value="morning">
                        Morning (6AM-12PM)
                      </SelectItem>
                      <SelectItem value="afternoon">
                        Afternoon (12PM-6PM)
                      </SelectItem>
                      <SelectItem value="evening">
                        Evening (6PM-12AM)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </MotionCard>

              {/* Flight List */}
              {flights.length > 0 ? (
                <MotionCard
                  className="shadow-lg border-sky-100"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <CardHeader>
                    <CardTitle className="text-2xl text-sky-700 flex items-center gap-2">
                      <Plane className="w-5 h-5" />
                      Available Flights
                    </CardTitle>
                    <CardDescription>
                      {flights.length} flights found from {from} to {to}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {flights
                        .filter(
                          (f) => filterTime === "all" || f.time === filterTime
                        )
                        .map((flight, index) => (
                          <motion.div
                            key={flight._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index, duration: 0.5 }}
                            whileHover={{ scale: 1.02 }}
                            className="flex flex-col md:flex-row justify-between items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-sky-100"
                          >
                            <div className="mb-4 md:mb-0 flex items-center gap-4">
                              <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-sky-100">
                                <Plane className="w-6 h-6 text-sky-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-lg text-sky-800">
                                  {flight.airline} - {flight.flightNumber}
                                </p>
                                <div className="flex items-center text-gray-700">
                                  <span className="font-medium">
                                    {flight.from}
                                  </span>
                                  <ArrowRight className="w-4 h-4 mx-2 text-sky-500" />
                                  <span className="font-medium">
                                    {flight.to}
                                  </span>
                                </div>
                                <div className="flex items-center mt-1 text-gray-600">
                                  {getTimeIcon(flight.time)}
                                  <span className="ml-1">
                                    {flight.time.charAt(0).toUpperCase() +
                                      flight.time.slice(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-4">
                              <div className="bg-sky-50 px-4 py-2 rounded-full">
                                <p className="text-xl font-bold text-sky-700">
                                  ₹{flight.price.toLocaleString()}
                                </p>
                              </div>
                              <Button
                                onClick={() => openBookingModal(flight._id)}
                                disabled={isLoading}
                                className="bg-sky-600 hover:bg-sky-700"
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Book Now
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </CardContent>
                </MotionCard>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-sky-100">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center"
                  >
                    <Plane className="w-16 h-16 text-sky-300 mb-4" />
                    <p className="text-gray-600 mb-2">No flights available.</p>
                    <p className="text-sm text-gray-500">
                      Try searching with valid airport codes (e.g., DEL to BOM).
                    </p>
                  </motion.div>
                </div>
              )}
            </TabsContent>

            {/* Booking History Tab */}
            <TabsContent value="history">
              <MotionCard
                className="shadow-lg border-sky-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CardHeader>
                  <CardTitle className="text-2xl text-sky-700 flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Your Travel History
                  </CardTitle>
                  <CardDescription>
                    View all your past bookings and download tickets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center"
                      >
                        <History className="w-16 h-16 text-sky-300 mb-4" />
                        <p className="text-gray-600 mb-2">No bookings yet</p>
                        <p className="text-sm text-gray-500">
                          Your booking history will appear here
                        </p>
                        <Button
                          className="mt-4 bg-sky-600 hover:bg-sky-700"
                          onClick={() => setActiveTab("search")}
                        >
                          Book Your First Flight
                        </Button>
                      </motion.div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking, index) => (
                        <motion.div
                          key={booking._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index, duration: 0.5 }}
                          whileHover={{ scale: 1.02 }}
                          className="p-4 bg-white rounded-lg shadow-md border border-sky-100"
                        >
                          <div className="flex flex-col md:flex-row justify-between">
                            <div className="flex items-start gap-4">
                              <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-sky-100">
                                <Plane className="w-6 h-6 text-sky-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-lg text-sky-800">
                                  {booking.flight.airline} -{" "}
                                  {booking.flight.flightNumber}
                                </p>
                                <div className="flex items-center text-gray-700">
                                  <span className="font-medium">
                                    {booking.flight.from}
                                  </span>
                                  <ArrowRight className="w-4 h-4 mx-2 text-sky-500" />
                                  <span className="font-medium">
                                    {booking.flight.to}
                                  </span>
                                </div>
                                <div className="flex items-center mt-1 text-gray-600">
                                  {getTimeIcon(booking.flight.time)}
                                  <span className="ml-1">
                                    {booking.flight.time
                                      .charAt(0)
                                      .toUpperCase() +
                                      booking.flight.time.slice(1)}
                                  </span>
                                </div>
                                <div className="flex items-center mt-1 text-gray-600">
                                  <Calendar className="w-4 h-4 text-sky-500 mr-1" />
                                  <span>
                                    Booked:{" "}
                                    {new Date(
                                      booking.createdAt
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2">
                              <div className="bg-sky-50 px-4 py-2 rounded-full">
                                <p className="text-lg font-bold text-sky-700">
                                  ₹{booking.price.toLocaleString()}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                className="border-sky-500 text-sky-600 hover:bg-sky-50"
                                onClick={async () => {
                                  try {
                                    const ticketRes = await fetch(
                                      `https://letsgo-makkah.vercel.app/api/ticket?bookingId=${booking._id}`
                                    );
                                    if (!ticketRes.ok) {
                                      throw new Error("Failed to fetch ticket");
                                    }
                                    const blob = await ticketRes.blob();
                                    const url =
                                      window.URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = `ticket-${booking._id}.pdf`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                  } catch (error: any) {
                                    toast.error("Failed to download ticket");
                                  }
                                }}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download Ticket
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </MotionCard>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-sky-800 text-white py-12 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Plane className="w-5 h-5" />
                SkyVoyage
              </h3>
              <p className="text-sky-200">
                Elevate your journey with premium flight experiences. Book your
                next adventure with us.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-sky-200 hover:text-white transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sky-200 hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sky-200 hover:text-white transition-colors"
                  >
                    FAQs
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sky-200 hover:text-white transition-colors"
                  >
                    Terms & Conditions
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Contact Us</h3>
              <p className="text-sky-200 mb-2">Email: support@skyvoyage.com</p>
              <p className="text-sky-200 mb-2">Phone: +1 (555) 123-4567</p>
              <div className="flex space-x-4 mt-4">
                <a
                  href="#"
                  className="text-white hover:text-sky-200 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-white hover:text-sky-200 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-white hover:text-sky-200 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-sky-700 text-center text-sky-300">
            <p>© {new Date().getFullYear()} SkyVoyage. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-lg shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-sky-800 flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Confirm Booking
            </DialogTitle>
          </DialogHeader>
          {selectedFlight && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-4"
            >
              <div className="p-4 bg-sky-50 rounded-lg mb-4">
                <p className="text-lg font-semibold text-sky-800">
                  {selectedFlight.airline} - {selectedFlight.flightNumber}
                </p>
                <div className="flex items-center text-gray-700 mt-2">
                  <span className="font-medium">{selectedFlight.from}</span>
                  <ArrowRight className="w-4 h-4 mx-2 text-sky-500" />
                  <span className="font-medium">{selectedFlight.to}</span>
                </div>
                <div className="flex items-center mt-2 text-gray-600">
                  {getTimeIcon(selectedFlight.time)}
                  <span className="ml-1">
                    {selectedFlight.time.charAt(0).toUpperCase() +
                      selectedFlight.time.slice(1)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Price:</span>
                <span className="text-lg font-bold text-sky-700">
                  ₹{selectedFlight.price.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Wallet Balance:</span>
                <span className="text-lg font-medium text-gray-700">
                  ₹{wallet.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Remaining Balance:</span>
                <span className="text-lg font-medium text-gray-700">
                  ₹{(wallet - selectedFlight.price).toLocaleString()}
                </span>
              </div>
            </motion.div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="border-sky-500 text-sky-600 hover:bg-sky-50"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBooking}
              disabled={isLoading}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {isLoading ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
