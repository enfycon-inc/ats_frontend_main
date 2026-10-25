"use client";
import useSWR from 'swr';
export interface LocationCountry { name: string; isoCode: string; phonecode?: string; flag?: string }
export interface LocationState { name: string; isoCode: string; countryCode: string }
export interface LocationCity { name: string; stateCode: string; countryCode: string }
const fetchLocations = async (url: string) => { const response = await fetch(url); if (!response.ok) throw new Error('Location options could not load. Please retry.'); return response.json(); };
const options = { revalidateOnFocus: false, revalidateOnReconnect: true, keepPreviousData: false };
const EMPTY: never[] = [];
export function useLocationData(countryValue = '', stateValue = '') {
  const countries = useSWR<LocationCountry[]>('/locations/countries.json', fetchLocations, options);
  const country = countries.data?.find(c => c.isoCode === countryValue || c.name === countryValue)?.isoCode;
  const states = useSWR<LocationState[]>(country ? `/locations/states/${encodeURIComponent(country)}.json` : null, fetchLocations, options);
  const state = states.data?.find(s => s.isoCode === stateValue || s.name === stateValue)?.isoCode;
  const cities = useSWR<LocationCity[]>(country && state ? `/locations/cities/${encodeURIComponent(country)}-${encodeURIComponent(state)}.json` : null, fetchLocations, options);
  return {
    Country: { getAllCountries: () => countries.data || EMPTY, getCountryByCode: (code: string) => countries.data?.find(c => c.isoCode === code) },
    State: { getStatesOfCountry: (code: string) => code === country ? states.data || EMPTY : EMPTY, getStateByCodeAndCountry: (code: string, parent: string) => parent === country ? states.data?.find(s => s.isoCode === code) : undefined },
    City: { getCitiesOfState: (parent: string, code: string) => parent === country && code === state ? cities.data || EMPTY : EMPTY },
    countries: countries.data || EMPTY,
    loading: countries.isLoading || states.isLoading || cities.isLoading,
    error: countries.error || states.error || cities.error,
    retry: () => Promise.all([countries.mutate(), states.mutate(), cities.mutate()]),
  };
}
export function useCitySearchData(enabled: boolean) {
  const countries = useSWR<LocationCountry[]>(enabled ? '/locations/countries.json' : null, fetchLocations, options);
  const indiaStates = useSWR<LocationState[]>(enabled ? '/locations/states/IN.json' : null, fetchLocations, options);
  const usStates = useSWR<LocationState[]>(enabled ? '/locations/states/US.json' : null, fetchLocations, options);
  const india = useSWR<LocationCity[]>(enabled ? '/locations/search/IN.json' : null, fetchLocations, options);
  const us = useSWR<LocationCity[]>(enabled ? '/locations/search/US.json' : null, fetchLocations, options);
  return { cities: [...(india.data || EMPTY), ...(us.data || EMPTY)], states: [...(indiaStates.data || EMPTY), ...(usStates.data || EMPTY)], countries: countries.data || EMPTY };
}
