using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CRM.BuildingBlocks.Exceptions;

public class AppException(string message, string? code = null, int statusCode = StatusCodes.Status400BadRequest)
    : Exception(message)
{
    public string Code { get; } = code ?? "Application.Error";
    public int StatusCode { get; } = statusCode;
}

public class BadRequestException(string message, string? code = null)
    : AppException(message, code ?? "Error.BadRequest", StatusCodes.Status400BadRequest);

public class ConflictException(string message, string? code = null)
    : AppException(message, code ?? "Error.Conflict", StatusCodes.Status409Conflict);

public class NotFoundException(string message, string? code = null)
    : AppException(message, code ?? "Error.NotFound", StatusCodes.Status404NotFound);

public class ForbiddenException(string message = "You do not have permission to access this resource.", string? code = null)
    : AppException(message, code ?? "Error.Forbidden", StatusCodes.Status403Forbidden);

public class UnauthorizedException(string message = "Authentication is required.", string? code = null)
    : AppException(message, code ?? "Error.Unauthorized", StatusCodes.Status401Unauthorized);

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "An unhandled exception occurred: {Message}", exception.Message);

        var (statusCode, title, detail, errors) = exception switch
        {
            ValidationException validationException => (
                StatusCodes.Status400BadRequest,
                "Validation Error",
                "One or more validation errors occurred.",
                validationException.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(x => x.ErrorMessage).ToArray())
            ),
            AppException appException => (
                appException.StatusCode,
                "Application Error",
                appException.Message,
                (Dictionary<string, string[]>?)null
            ),
            _ => (
                StatusCodes.Status500InternalServerError,
                "Internal Server Error",
                "An unexpected error occurred. Please try again later.",
                (Dictionary<string, string[]>?)null
            )
        };

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = httpContext.Request.Path
        };

        if (errors is not null)
        {
            problemDetails.Extensions["errors"] = errors;
        }

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return true;
    }
}
