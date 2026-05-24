function RootComponent() {

  const { queryClient } =
  Route.useRouteContext();

  return (

    <QueryClientProvider
      client={queryClient}
    >

      <AuthProvider>

        <RoleProvider>

          <RouteTransition>

            <Outlet />

          </RouteTransition>

          <Toaster />

        </RoleProvider>

      </AuthProvider>

    </QueryClientProvider>

  );

}
