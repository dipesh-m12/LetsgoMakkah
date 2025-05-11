"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2 } from "lucide-react";

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
      const res = await axios.get("http://localhost:3001/api/flights/suggest", {
        params: { query: value },
      });
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
      const res = await axios.get("http://localhost:3001/api/flights/search", {
        params: { from, to },
      });
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
      const res = await axios.post("http://localhost:3001/api/flights/book", {
        flightId: selectedFlight._id,
      });
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
          `http://localhost:3001/api/ticket?bookingId=${res.data.data._id}`
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
        const res = await axios.get("http://localhost:3001/api/bookings");
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-gray-100">
      <Toaster position="top-right" />
      <div className="container mx-auto p-4 max-w-5xl">
        <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-800">
          SkyVoyage: Book Your Flight
        </h1>

        {/* Wallet */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-green-600">
              Wallet Balance: ₹{wallet.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Search Bar */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <Input
                  placeholder="From (City/Airport)"
                  value={from}
                  onChange={(e) => handleInputChange(e.target.value, "from")}
                  className="w-full border-blue-300 focus:ring-blue-500"
                />
                {activeInput === "from" && suggestions.length > 0 && (
                  <div className="absolute z-10 bg-white border rounded-md mt-1 w-full max-h-40 overflow-y-auto shadow-md">
                    {suggestions.map((s) => (
                      <Button
                        key={s.PlaceId}
                        variant="ghost"
                        className="w-full text-left justify-start hover:bg-blue-50"
                        onClick={() => {
                          setFrom(s.IataCode);
                          setSuggestions([]);
                          setActiveInput(null);
                        }}
                      >
                        {s.PlaceName} ({s.IataCode})
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <Input
                  placeholder="To (City/Airport)"
                  value={to}
                  onChange={(e) => handleInputChange(e.target.value, "to")}
                  className="w-full border-blue-300 focus:ring-blue-500"
                />
                {activeInput === "to" && suggestions.length > 0 && (
                  <div className="absolute z-10 bg-white border rounded-md mt-1 w-full max-h-40 overflow-y-auto shadow-md">
                    {suggestions.map((s) => (
                      <Button
                        key={s.PlaceId}
                        variant="ghost"
                        className="w-full text-left justify-start hover:bg-blue-50"
                        onClick={() => {
                          setTo(s.IataCode);
                          setSuggestions([]);
                          setActiveInput(null);
                        }}
                      >
                        {s.PlaceName} ({s.IataCode})
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={searchFlights}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  "Search Flights"
                )}
              </Button>
            </div>
            <Select onValueChange={setFilterTime} value={filterTime}>
              <SelectTrigger className="w-full md:w-1/3 border-blue-300">
                <SelectValue placeholder="Filter by Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Times</SelectItem>
                <SelectItem value="morning">Morning (6AM-12PM)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12PM-6PM)</SelectItem>
                <SelectItem value="evening">Evening (6PM-12AM)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Flight List */}
        {flights.length > 0 ? (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-blue-700">
                Available Flights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flights
                  .filter((f) => filterTime === "all" || f.time === filterTime)
                  .map((flight) => (
                    <div
                      key={flight._id}
                      className="flex flex-col md:flex-row justify-between items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    >
                      <div className="mb-4 md:mb-0">
                        <p className="font-semibold text-lg">
                          {flight.airline} - {flight.flightNumber}
                        </p>
                        <p className="text-gray-700">
                          {flight.from} → {flight.to}
                        </p>
                        <p className="text-gray-600">Time: {flight.time}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className="text-xl font-bold text-green-600">
                          ₹{flight.price.toLocaleString()}
                        </p>
                        <Button
                          onClick={() => openBookingModal(flight._id)}
                          disabled={isLoading}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="text-center text-gray-600 mb-8">
            No flights available. Try searching with valid airport codes (e.g.,
            DEL to BOM).
          </p>
        )}

        {/* Booking Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white rounded-lg shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl text-blue-800">
                Confirm Booking
              </DialogTitle>
            </DialogHeader>
            {selectedFlight && (
              <div className="py-4">
                <p className="text-lg font-semibold">
                  {selectedFlight.airline} - {selectedFlight.flightNumber}
                </p>
                <p className="text-gray-700">
                  Route: {selectedFlight.from} → {selectedFlight.to}
                </p>
                <p className="text-gray-600">Time: {selectedFlight.time}</p>
                <p className="text-lg font-bold text-green-600">
                  Price: ₹{selectedFlight.price.toLocaleString()}
                </p>
                <p className="text-gray-600 mt-2">
                  Wallet Balance: ₹{wallet.toLocaleString()}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-blue-500 text-blue-500 hover:bg-blue-50"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmBooking}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Booking History */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-blue-700">
              Booking History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-gray-600">No bookings yet</p>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="p-4 bg-white rounded-lg shadow-md"
                  >
                    <p className="font-semibold text-lg">
                      {booking.flight.airline} - {booking.flight.flightNumber}
                    </p>
                    <p className="text-gray-700">
                      {booking.flight.from} → {booking.flight.to}
                    </p>
                    <p className="text-gray-600">
                      Price: ₹{booking.price.toLocaleString()}
                    </p>
                    <p className="text-gray-600">
                      Booked: {new Date(booking.createdAt).toLocaleString()}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-2 border-blue-500 text-blue-500 hover:bg-blue-50"
                      onClick={async () => {
                        try {
                          const ticketRes = await fetch(
                            `http://localhost:3001/api/ticket?bookingId=${booking._id}`
                          );
                          if (!ticketRes.ok) {
                            throw new Error("Failed to fetch ticket");
                          }
                          const blob = await ticketRes.blob();
                          const url = window.URL.createObjectURL(blob);
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
                      Download Ticket
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
