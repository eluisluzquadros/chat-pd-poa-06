
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InterestUser } from "@/types/interest";

export const useInterestManagement = (searchTerm: string) => {
  const [selectedInterest, setSelectedInterest] = useState<InterestUser | null>(null);

  const { data: interests = [], refetch } = useQuery({
    queryKey: ["interest_manifestations", searchTerm],
    queryFn: async () => {
      try {
        let query = supabase
          .from("interest_manifestations")
          .select("*");

        if (searchTerm) {
          query = query.or(
            `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
          );
        }

        // Focus on interests that haven't been converted to accounts yet
        query = query.eq("account_created", false);

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching interests:", error);
          return [];
        }

        return data as InterestUser[];
      } catch (error) {
        console.error("Failed to fetch interests:", error);
        return [];
      }
    },
  });

  return {
    interests,
    selectedInterest,
    setSelectedInterest,
    refetch,
  };
};
