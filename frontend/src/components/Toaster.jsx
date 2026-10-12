import React from 'react';

function Toast({ message, type, onClose }) {
  return (
    <div
      className={`fixed top-4 right-4 px-4 py-2 border rounded bg-white ${
        type === "success"
          ? "border-green-600 text-green-700"
          : "border-red-600 text-red-700"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">{message}</p>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-black"
        >
          x
        </button>
      </div>
    </div>
  );
}

export default Toast;