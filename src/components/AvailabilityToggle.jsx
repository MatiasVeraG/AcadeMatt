import React, { useState, useEffect } from 'react';
import { Power, Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const AvailabilityToggle = () => {
  const { currentUser, setAvailability } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Obtener disponibilidad actual
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setIsAvailable(userDoc.data().available || false);
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchAvailability();
  }, [currentUser]);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const newAvailability = !isAvailable;
      await setAvailability(newAvailability);
      setIsAvailable(newAvailability);
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('Failed to update availability. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isAvailable ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Power className={`w-5 h-5 ${isAvailable ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Availability</h3>
            <p className="text-sm text-gray-500">
              {isAvailable ? 'Accepting consultations' : 'Not available'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isAvailable 
              ? 'bg-green-500 focus:ring-green-500' 
              : 'bg-gray-300 focus:ring-gray-400'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              isAvailable ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          {isAvailable 
            ? 'You will receive new consultations automatically based on your capacity'
            : 'You will not receive new consultations while unavailable'
          }
        </p>
      </div>
    </div>
  );
};

export default AvailabilityToggle;

