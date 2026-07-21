using Microsoft.AspNetCore.Mvc;
using System.Net;

namespace backend.Common
{
    public static class ApiResponseHelper
    {
        public static IActionResult ApiResponse(
            ControllerBase controller,
            string apiCode, HttpStatusCode statusCode,
            string message, string status, object payload)
        {
            return controller.StatusCode((int)statusCode, new
            {
                apiCodeStatus = apiCode,
                statusCode = (int)statusCode,
                message = message,
                status = status,
                payload = payload
            });
        }
    }
}